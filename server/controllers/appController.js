
import UserModel from "../Model/User.model.js";
import bcrypt from 'bcrypt';
import ENV from '../config.js';
import jwt from 'jsonwebtoken';
import otpGenerator from 'otp-generator';


/** Middleware for verify user */
export async function verifyUser(req, res, next){
    try {
        
        const { username } = req.method == "GET" ? req.query : req.body;

        // check the user existance
        let exist = await UserModel.findOne({username});
        if(!exist) return res.status(404).send({error: "Can't find User!"});
        next();

    } catch (error) {
        return res.status(404).send({error: "Authentication Error"});
    }
}


/**POST: http://localhost:8080/api/register */
export async function register(req, res) {
    try {
      const {
        username,
        password,
        profile,
        email,
        firstName,
        lastName,
        mobile,
        address,
        city
      } = req.body;
  
      // Check if username exists
      const existingUsername = await UserModel.findOne({ username });
      if (existingUsername) {
        return res.status(400).send({ error: "Please use unique username" });
      }
  
      // Check if email exists
      const existingEmail = await UserModel.findOne({ email });
      if (existingEmail) {
        return res.status(400).send({ error: "Please use unique email" });
      }
  
      if (!password) {
        return res.status(400).send({ error: "Password is required" });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create user with all fields
      const user = new UserModel({
        username,
        password: hashedPassword,
        email,
        profile: profile || '',
        firstName,
        lastName,
        mobile,
        address,
        city
      });
  
      await user.save();
      return res.status(201).send({ msg: "User Registration Successful" });
  
    } catch (error) {
      return res.status(500).send({ error: error.message || "Internal Server Error" });
    }
  }
  

/**POST: http://localhost:8080/api/login */
export async function login(req,res){
   
        try {

            const {username, password} = req.body;

            const user = await UserModel.findOne({ username });
            if (!user) return res.status(404).send({ error: "Username not Found" });

            const passwordCheck = await bcrypt.compare(password, user.password);
            if (!passwordCheck) return res.status(400).send({ error: "Incorrect Password" });

            const token = jwt.sign(
                { userId: user._id, username: user.username },
                ENV.JWT_SECRET,
                { expiresIn: "24h" }
            );

            return res.status(200).send({
                msg: "Login Successful..!",
                username: user.username,
                token
            });

        } catch (error) {
            console.error("Login Error:", error);
            return res.status(500).send({ error });
        }
}

/**PUT: http://localhost:8080/api/updateUser */
export async function updateUser(req, res) {
    try {
        //const id = req.query.id;
        const {userId} = req.user;

        if (!userId) {
            return res.status(400).send({ msg: "User ID not provided" });
        }

        const body = req.body;

        const result = await UserModel.updateOne({ _id: userId }, body);

        if (result.modifiedCount === 0) {
            return res.status(404).send({ msg: "No record updated. User may not exist." });
        }

        return res.status(200).send({ msg: "Record Updated...!", result });

    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}


/**GET: http://localhost:8080/api/user/example123 */
export async function getUser(req, res) {
        try {
        const { username } = req.params;
    
            if (!username) {
                return res.status(400).send({ error: "Invalid Username" }); // 400 = Bad Request
            }
    
        const user = await UserModel.findOne({ username });
        
            if (!user) {
                return res.status(404).send({ error: "Couldn't Find the User" });
            }

            const {password, ...rest} = Object.assign({}, user.toJSON());
    
        return res.status(200).send(rest); // 200 = OK

        } catch (error) {
            console.error("getUser error:", error);
            return res.status(500).send({ error: "Cannot Find User Data" });
        }
  }

/**GET: http://localhost:8080/api/generateOTP */
export async function generateOTP(req,res){
    req.app.locals.OTP = await otpGenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false});
    res.status(201).send({code: req.app.locals.OTP });
}

/**GET: http://localhost:8080/api/verifyOTP */
export async function verifyOTP(req,res){
    const {code} = req.query;

    if(parseInt(req.app.locals.OTP) === parseInt(code)){
        req.app.locals.OTP = null;
        req.app.locals.resetSession = true;
        return res.status(201).send({ msg: 'Verify Successfully!'});
    }
    return res.status(400).send({ error: "Invalid OTP"});
}

/**GET: http://localhost:8080/api/createResetSession */
export async function createResetSession(req,res){
    
    if(req.app.locals.resetSession){
        return res.status(201).send({ flag :  req.app.locals.resetSession})
    }

    return res.status(440).send({ error: "Session expired"})
}

/**PUT: http://localhost:8080/api/ResetPassword */
export async function resetPassword(req, res) {
    try {

        if(!req.app.locals.resetSession){
            return res.status(404).send({error:"Session Expired"})
        }
      const { username, password } = req.body;
  
      const user = await UserModel.findOne({ username });
      if (!user) {
        return res.status(404).send({ error: "Username not found" });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await UserModel.updateOne(
        { username: user.username },
        { password: hashedPassword }
      );

      req.app.locals.resetSession = false;
  
      return res.status(201).send({ msg: "Password reset successfully", result });
  
    } catch (error) {
      return res.status(500).send({ error: "Something went wrong" });
    }
  }
  

