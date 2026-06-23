const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        $or: [
            { _id: mongoose.isValidObjectId(fromAccount) ? fromAccount : null },
            { accountNumber: fromAccount }
        ]
    })

    const toUserAccount = await accountModel.findOne({
        $or: [
            { _id: mongoose.isValidObjectId(toAccount) ? toAccount : null },
            { accountNumber: toAccount }
        ]
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (fromUserAccount.accountNumber !== "0000000000" && balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction;
    try {


        /**
         * 5. Create transaction (PENDING)
         */
        const session = await mongoose.startSession()
        session.startTransaction()

        transaction = (await transactionModel.create([ {
            fromAccount: fromUserAccount._id,
            toAccount: toUserAccount._id,
            amount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        const debitLedgerEntry = await ledgerModel.create([ {
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        const creditLedgerEntry = await ledgerModel.create([ {
            account: toUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )


        await session.commitTransaction()
        session.endSession()
    } catch (error) {

        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after sometime",
        })

    }
    /**
     * 10. Send email notification
     */
    

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        $or: [
            { _id: mongoose.isValidObjectId(toAccount) ? toAccount : null },
            { accountNumber: toAccount }
        ]
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }


    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount: toUserAccount._id,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([ {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    } ], { session })

    const creditLedgerEntry = await ledgerModel.create([ {
        account: toUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    } ], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })


}

async function getUserTransactions(req, res) {
    try {
        const { accountId } = req.query;
        let query = {};

        if (accountId) {
            if (!mongoose.isValidObjectId(accountId)) {
                return res.status(400).json({
                    message: "Invalid account ID format"
                });
            }
            const account = await accountModel.findOne({ _id: accountId, user: req.user._id });
            if (!account) {
                return res.status(404).json({
                    message: "Account not found or unauthorized access"
                });
            }
            query = {
                $or: [
                    { fromAccount: accountId },
                    { toAccount: accountId }
                ]
            };
        } else {
            const accounts = await accountModel.find({ user: req.user._id });
            const accountIds = accounts.map(acc => acc._id);
            query = {
                $or: [
                    { fromAccount: { $in: accountIds } },
                    { toAccount: { $in: accountIds } }
                ]
            };
        }

        const transactions = await transactionModel.find(query).sort({ createdAt: -1 });

        const enrichedTransactions = await Promise.all(
            transactions.map(async (tx) => {
                const fromAcc = await accountModel.findById(tx.fromAccount).populate("user", "name");
                const toAcc = await accountModel.findById(tx.toAccount).populate("user", "name");

                let category = "Transfer";
                let description = "Direct Ledger Post";

                if (fromAcc && toAcc) {
                    if (fromAcc.user?._id?.toString() === req.user._id.toString() && toAcc.user?._id?.toString() === req.user._id.toString()) {
                        category = "Transfer";
                        description = `Internal Transfer from ${fromAcc.accountNumber} to ${toAcc.accountNumber}`;
                    } else if (fromAcc.user?._id?.toString() === req.user._id.toString()) {
                        category = "Shopping";
                        description = `Sent to ${toAcc.accountNumber} (${toAcc.user?.name || 'External'})`;
                    } else {
                        category = "Salary";
                        description = `Received from ${fromAcc.accountNumber} (${fromAcc.user?.name || 'System'})`;
                    }
                } else if (fromAcc) {
                    category = "Other";
                    description = `Sent to External ID: ${tx.toAccount}`;
                } else if (toAcc) {
                    category = "Salary";
                    description = `Received from External ID: ${tx.fromAccount}`;
                }

                return {
                    _id: tx._id,
                    fromAccount: tx.fromAccount,
                    fromName: fromAcc ? (fromAcc.accountNumber === "0000000000" ? "System Core Vault" : fromAcc.user?.name) : "External Source",
                    fromAccountNumber: fromAcc ? fromAcc.accountNumber : "SYSTEM",
                    toAccount: tx.toAccount,
                    toName: toAcc ? (toAcc.accountNumber === "0000000000" ? "System Core Vault" : toAcc.user?.name) : "External Target",
                    toAccountNumber: toAcc ? toAcc.accountNumber : tx.toAccount,
                    amount: tx.amount,
                    category: category,
                    description: description,
                    status: tx.status,
                    createdAt: tx.createdAt
                };
            })
        );

        res.status(200).json({
            transactions: enrichedTransactions
        });
    } catch (err) {
        res.status(500).json({
            message: "Failed to fetch transactions: " + err.message
        });
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getUserTransactions
}