const express = require("express");
const validator = require("validator");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const UserSchema = require("./UserSchema");
const session = require("express-session");
const mongoDBSession = require("connect-mongodb-session")(session);

//models
const TodoModel = require("./models/TodoModel");

//middlewares
const { cleanUpAndValidate } = require("./utils/AuthUtils");
const isAuth = require("./middleware/isAuth");
const rateLimiting = require("./middleware/rateLimiting");

const app = express();

app.set("view engine", "ejs");

//connections
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
app.use(express.static("public"));

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
    res.render("/login");
});

app.get("/login", (req, res) => {
    return res.render("login");
});

app.get("/register", (req, res) => {
    return res.render("register");
});

app.post("/register", async (req, res) => {
    //console.log(req.body);
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
        res.redirect("/login");
        // return res.send({
        //     status: 201,
        //     message: "Registered Successfully ",
        //     data: {
        //         _id: userDB._id,
        //         username: userDB.username,
        //         email: userDB.email,
        //     },
        // });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Internal Server Error, Please try again",
            error: err,
        });
    }
});

app.post("/login", async (req, res) => {
    //console.log(req.body);
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

app.get("/home", isAuth, (req, res) => {
    if (req.session.isAuth) {
        return res.send({
            message: "This is your home page",
        });
    } else {
        return res.send({
            message: "Please Login again",
        });
    }
});

app.post("/logout", isAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/login");
    });
});

app.post("/logout_from_all_devices", isAuth, async (req, res) => {
    // console.log(req.session.user.username);
    const username = req.session.user.username;

    const Schema = mongoose.Schema;
    const sessionSchema = new Schema({ _id: String }, { strict: false });
    const SessionModel = mongoose.model("session", sessionSchema);

    try {
        const sessionDb = await SessionModel.deleteMany({
            "session.user.username": username,
        });
        console.log(sessionDb);
        return res.send({
            status: 200,
            message: "Logged out from all devices",
        });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Logout from all devices failed",
            error: err,
        });
    }
});

app.get("/dashboard", isAuth, async (req, res) => {
    // let todos = [];
    // try {
    //     todos = await TodoModel.find({ username: req.session.user.username });
    //     // console.log(todos);
    // } catch (err) {
    //     return res.send({
    //         status: 400,
    //         message: "Database error. Please try again",
    //     });
    // }
    return res.render("dashboard");
});

app.post("/pagination_dashboard", async (req, res) => {
    const skip = req.query.skip || 0;
    const LIMIT = 5;
    const username = req.session.user.username;

    try {
        let todos = await TodoModel.aggregate([
            { $match: { username: username } },
            {
                $facet: {
                    data: [{ $skip: parseInt(skip) }, { $limit: LIMIT }],
                },
            },
        ]);
        return res.send({
            status: 200,
            message: "Read Successfully",
            data: todos,
        });
    } catch (err) {
        console.log(err);
        return res.send({
            status: 400,
            message: "Database error. Please try again",
        });
    }
});

app.post("/create-item", isAuth, rateLimiting, async (req, res) => {
    // console.log(req.body, "hi");
    const todoText = req.body.todo;

    if (!todoText) {
        return res.send({
            status: 400,
            message: "Missing Parameters",
        });
    }

    if (todoText.length > 100) {
        return res.send({
            status: 400,
            message: "Todo text is very long. Max limit 100 character allowed",
        });
    }

    let todo = new TodoModel({
        todo: todoText,
        username: req.session.user.username,
    });
    try {
        const todoDb = await todo.save();
        return res.send({
            status: 200,
            message: "Todo created successfully",
            data: todoDb,
        });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Database error, Please Try again",
        });
    }
});

app.post("/edit-item", isAuth, async (req, res) => {
    const id = req.body.id;
    const newData = req.body.newData;
    console.log(req.body);

    if (!id || !newData) {
        return res.send({
            status: 404,
            message: "Missing Parameters",
            error: "Missing todo Data",
        });
    }

    try {
        const tododDb = await TodoModel.findOneAndUpdate(
            { _id: id },
            { todo: newData }
        );
        return res.send({
            status: 200,
            message: "Update todo successfuly",
            data: tododDb,
        });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Database Error, Please Try again",
            error: err,
        });
    }
});

app.post("/delete-item", isAuth, async (req, res) => {
    // console.log(req.body);
    const id = req.body.id;
    // console.log(id);
    if (!id) {
        return res.send({
            status: 404,
            message: "Missing Parameters",
            error: "Missing id of todo to Delete",
        });
    }

    try {
        const tododDb = await TodoModel.findOneAndDelete({ _id: id });
        return res.send({
            status: 200,
            message: "todo Deleted successfuly",
            data: tododDb,
        });
    } catch (err) {
        return res.send({
            status: 400,
            message: "Database Error, Please Try again",
            error: err,
        });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Listening to post ${PORT}`);
});
