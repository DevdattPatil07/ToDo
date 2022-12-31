const validator = require("validator");

const cleanUpAndValidate = ({ name, password, email, username, phone }) => {
    return new Promise((resolve, reject) => {
        if (typeof email != "string") reject("Invalid Email");
        if (typeof name != "string") reject("Invalid Name");
        if (typeof username != "string") reject("Invalid Username");
        if (typeof password != "string") reject("Invalid Password");

        if (!email || !password || !username || !name) reject("Invalid Data");

        if (!validator.isEmail(email)) reject("Invalid Email Format");

        if (username.length < 3) reject("Username too short");

        if (username.length > 50) reject("Username too long");

        if (password.length < 5) reject("Password too short");

        if (password.length > 200) reject("Password too long");

        if (phone.length != 10) reject("Incorrect Phone Number");

        resolve();
    });
};

module.exports = { cleanUpAndValidate };
