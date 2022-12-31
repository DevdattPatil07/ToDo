const express = require("express");
const validator = require("validator");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const UserSchema = require("./UserSchema");
const session = require("express-session");
const mongoDBSession = require("connect-mongodb-session")(session);

const { cleanUpAndValidate } = require("./utils/AuthUtils");
const isAuth = require("./middleware");
const app = express();

app.set("view engine", "ejs");

mongoose.set("strictQuery", false);
const mongoURI = `mongodb+srv://tempdb:tempdbpassword@cluster0.2ur6dtf.mongodb.net/auth-node`;
mongoose
    .connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then((res) => {
        console.log("Connect to DB successfully");
    })
    .catch((err) => {
        console.log("Failed to connect", err);
    });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const store = new mongoDBSession({
    uri: mongoURI,
    collection: "sessions",
});

app.use(
    session({
        secret: "hello backendjs",
        resave: false,
        saveUninitialized: false,
        store: store,
    })
);

app.get("/", (req, res) => {
    res.send("Welcome to my app");
});

app.get("/login", (req, res) => {
    return res.render("login");
});

app.get("/register", (req, res) => {
    return res.render("register");
});

app.post("/register", async (req, res) => {
    console.log(req.body);
    const { name, email, username, password, phone } = req.body;
    try {
        await cleanUpAndValidate({ name, password, email, username, phone });
    } catch (err) {
        return res.send({
            status: 400,
            message: err,
        });
    }

    const hashedPassword = await bcrypt.hash(password, 7);

    let user = new UserSchema({
        name: name,
        username: username,
        password: hashedPassword,
        email: email,
        phone: phone,
    });

    let userExists;
    try {
        let userExists = await UserSchema.findOne({ email });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Internal Server Error, Please try again",
            error: err,
        });
    }

    if (userExists) {
        return res.send({
            status: 400,
            message: "User already exists",
        });
    }
    try {
        const userDB = await user.save();
        console.log(userDB);
        return res.send({
            status: 201,
            message: "Register Successfully ",
            data: {
                _id: userDB._id,
                username: userDB.username,
                email: userDB.email,
            },
        });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Internal Server Error, Please try again",
            error: err,
        });
    }
});

app.post("/login", async (req, res) => {
    console.log(req.body);
    const { loginId, password } = req.body;

    if (
        typeof loginId !== "string" ||
        typeof password !== "string" ||
        !loginId ||
        !password
    ) {
        return res.send({
            status: 400,
            message: "Invalid Data/Incomplete Data",
        });
    }

    let userDB;
    try {
        if (validator.isEmail(loginId)) {
            userDB = await UserSchema.findOne({ email: loginId });
        } else {
            userDB = await UserSchema.findOne({ username: loginId });
        }
        console.log(userDB);

        if (userDB == null) {
            return res.send({
                status: 400,
                message: "User not found, Please register first!",
            });
        }

        const isMatch = await bcrypt.compare(password, userDB.password);

        if (!isMatch) {
            return res.send({
                status: 400,
                message: "Invalid Password",
                data: req.body,
            });
        }
        req.session.isAuth = true;
        req.session.user = {
            username: userDB.username,
            email: userDB.email,
            userId: userDB._id,
        };

        res.redirect("/dashboard");
    } catch (err) {
        return res.send({
            status: 400,
            message: "Internal Servar Error, Please login again!",
            error: err,
        });
    }
});

// app.get("/home", isAuth, (req, res) => {
//     if (req.session.isAuth) {
//         return res.send({
//             message: "This is your home page",
//         });
//     } else {
//         return res.send({
//             message: "Please Login again",
//         });
//     }
// });

app.post("/logout", isAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/login");
    });
});

app.get("/dashboard", isAuth, (req, res) => {
    return res.render("dashboard");
});
app.get("/api/:id", (req, res) => {
    console.log(req.params.id);
});

app.listen(8000, () => {
    console.log("Listening to post 8000");
});
