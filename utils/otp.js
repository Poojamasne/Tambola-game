const axios = require('axios');
require('dotenv').config();

exports.sendOTP = async (phone_number) => {
    try {
        const response = await axios.get(`https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/${phone_number}/AUTOGEN`);
        if (response.data.Status !== "Success") throw new Error("OTP sending failed");
        return response.data.Details;
    } catch (error) {
        console.error("OTP sending failed:", error.response?.data || error.message);
        return null;
    }
};

exports.verifyOTP = async (sessionId, otp) => {
    try {
        const response = await axios.get(`https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`);
        return response.data.Status === "Success";
    } catch (error) {
        console.error("OTP verification failed:", error.response?.data || error.message);
        return false;
    }
};
