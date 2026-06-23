const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [ true, "Email is required" ],
        trim: true,
        lowercase: true,
        match: [ /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address" ],
        unique: [ true, "Email already exists" ]
    },

    name: {
        type: String, 
        required: [ true, "Name is required" ],
    },

    password: {
        type: String,
        required: [ true, "Password is required" ],
        minlength: [6, "Password must be at least 6 characters long" ],
        select: false
    },

    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false
    }
}, {
    timestamps: true
})

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    if (/^\$2[aby]\$/.test(this.password)) return;

    this.password = await bcrypt.hash(this.password, 10);
})

userSchema.methods.comparePassword = async function (password) {
    const stored = this.password;
    const isBcryptHash = /^\$2[aby]\$/.test(stored);

    if (isBcryptHash) {
        return bcrypt.compare(password, stored);
    }

    if (stored !== password) {
        return false;
    }

    this.password = await bcrypt.hash(password, 10);
    await this.save({ validateBeforeSave: false });
    return true;
}

const usermodel = mongoose.model("user", userSchema);

module.exports = usermodel;
