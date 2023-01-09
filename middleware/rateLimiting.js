const AccessModel = require("../models/AccessModel");

const rateLimiting = async (req, res, next) => {
    const sessionId = req.session.id;
    console.log(sessionId);
    if (!sessionId) {
        return res.send({
            status: 400,
            message: "Invalid Session, Please log in again",
        });
    }

    const sessionTimeDb = await AccessModel.findOne({ sessionId: sessionId });

    if (!sessionTimeDb) {
        const accessTime = new AccessModel({
            sessionId: sessionId,
            time: Date.now(),
        });
        await accessTime.save();
        next();
        return;
    }

    const prevAccessTime = sessionTimeDb.time;
    const currAccessTime = Date.now();

    if (currAccessTime - prevAccessTime < 2000) {
        return res.send({
            status: 400,
            message: "Too many requests. Please try in some time",
        });
    }
    await AccessModel.findOneAndUpdate(
        { sessionId: sessionId },
        { time: Date.now() }
    );

    next();
    return;
};

module.exports = rateLimiting;
