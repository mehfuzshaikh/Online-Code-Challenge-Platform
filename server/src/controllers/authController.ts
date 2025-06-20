import { USER,UserDocument } from '../models/userModel';
import { Request,Response} from 'express';
import jwt,{ SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms'; // For solve error on expiresIn
import { sendEmail } from '../utils/sendEmail';
import crypto from 'crypto';
import { otpEmailTemplate,passwordResetTemplate } from '../utils/emailTemplates';
// In this file you show new things we use, it is for solve typescript error

const jwtSecret = process.env.JWT_SECRET_KEY as string;
const jwtExpireIn = (process.env.JWT_EXPIRES_IN || '1d') as StringValue;

const generateToken = (id:string):string=>{
    const options:SignOptions = { expiresIn:jwtExpireIn };
    return jwt.sign({id},jwtSecret,options)
}

const generateOTP = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

const setCookiesToken = (res: Response, token: string) => {
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
};


export const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, confirmPassword, username } = req.body;

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const expirationThreshold = 10 * 60 * 1000; // 10 minute

    const existingUser = await USER.findOne({$or: [{ email }, { username }],isActive: true});

    if (existingUser) {
      const isSameEmail = existingUser.email === email;
      const isVerified = existingUser.isVerified;

      const isExpired = !isVerified && existingUser.createdAt && Date.now() - new Date(existingUser.createdAt).getTime() > expirationThreshold;

      if (isVerified) {
        const conflictField = isSameEmail ? "Email" : "Username";
        res.status(400).json({ message: `${conflictField} is already in use.`});
        return;
      }

      if (!isVerified && isSameEmail) {
        const usernameConflict = await USER.findOne({
          username,
          _id: { $ne: existingUser._id },
          isActive: true,
          isVerified: true,
        });
        if (usernameConflict) {
          res.status(400).json({ message: "Username is already in use." });
          return;
        }

        existingUser.password = password;
        existingUser.confirmPassword = confirmPassword;
        existingUser.username = username;
        existingUser.verificationCode = otp;
        existingUser.otpExpires = otpExpires;
        await existingUser.save();

        await sendEmail(email,"Verification code",otpEmailTemplate(otp,false));

        res.status(201).json({ message: "OTP resent successfully. Please check your email."});
        return;
      }

      if (!isVerified && isExpired) {
        await USER.deleteOne({ _id: existingUser._id });
      } else {
        const conflictField = isSameEmail ? "Email" : "Username";
        res.status(400).json({
          message: `${conflictField} is already in use`,
        });
        return;
      }
    }

    const newUser = await USER.create({
      email,
      password,
      confirmPassword,
      username,
      verificationCode: otp,
      otpExpires,
    });

    await sendEmail(email,"Verification code",otpEmailTemplate(otp,false));

    res.status(201).json({ message: "OTP sent successfully. Please check your email." });
  } catch (error) {
    res.status(400).json({message: "Something went wrong",error: (error as Error).message});
  }
};
  
export const verifyOtp = async(req:Request,res:Response):Promise<void>=>{
    try {
        const { email,otp } = req.body;

        if(!email || !otp){
            res.status(400).json({message:'Email and OTP are required'});
            return;
        }

        const user = await USER.findOne({email,verificationCode:otp}).select('+otpExpires');
        if(!user){
            res.status(400).json({message:'Invalid OTP'});
            return;
        }
        
        if (user.otpExpires && user.otpExpires < new Date()) {
            res.status(400).json({ message: 'OTP has expired' });
            return;
        }
        user.isVerified = true;
        user.verificationCode = undefined;
        user.otpExpires = undefined;
        user.otpRequestedAt = undefined;
        await user.save();
        
        const token = generateToken(user._id.toString());

        setCookiesToken(res,token);

        res.status(201).json({message:'Sign up successful!',token});
    } catch (error) {
        res.status(400).json({message:'Something went wrong',error:(error as Error).message});
    }
}

export const logIn = async(req:Request,res:Response):Promise<void>=>{
    try {
        const {email,password} = req.body;

        if(!email || !password){
            res.status(400).json({message:'Please enter email and password'});
            return;
        } 
        const user = await USER.findOne({email,isActive:true}).select('+password') as UserDocument | null;
        let correct;
        if(user)
        {
            correct = await user.correctPassword(password,user.password);
        }
        if(!user || !correct){
            res.status(401).json({message:'Invalid email or password'});
            return;
        }
        const token = generateToken(user._id.toString());

        const userObject = user.toObject() as Record<string,any>;
        delete userObject.password;

        setCookiesToken(res,token);

        res.status(200).json({message:'Login successful',data:userObject,token});
    } catch (error) {
        res.status(400).json({message:'Something went wrong',error:(error as Error).message});
    }
}

export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;

        if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
        }

        const user = await USER.findOne({ email, isActive: true }).select("+otpExpires +otpRequestedAt");
        if (!user) {
        res.status(400).json({ message: "User not found" });
        return;
        }

        if (user.isVerified) {
        res.status(400).json({ message: "User is already verified" });
        return;
        }

        const now = new Date();
        if (user.otpRequestedAt && now.getTime() - user.otpRequestedAt.getTime() < 60 * 1000) {
        const remaining = Math.ceil((60 * 1000 - (now.getTime() - user.otpRequestedAt.getTime())) / 1000);
        res.status(429).json({message: `Please wait ${remaining} seconds before requesting a new OTP.`});
        return;
        }

        const newOTP = generateOTP();
        user.verificationCode = newOTP;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        user.otpRequestedAt = now;
        await user.save();

        sendEmail(user.email,"Resend OTP", otpEmailTemplate(newOTP, true));
        res.status(200).json({ message: "OTP resent successfully. Please check your email." });
    } catch (error) {
        res.status(500).json({message: "Something went wrong",error: (error as Error).message});
    }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required" });
            return;
        }
    
        const user = await USER.findOne({ email, isActive: true , isVerified:true });
        if (!user) {
            res.status(400).json({ message: "User with this email does not exist" });
            return;
        }
    
        const { token, hashedToken } = generateResetToken();
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();
    
        // const resetLink = `${req.protocol}://${req.get('host')}/api/v1/user/reset-password/${token}`;  // For postman
        const resetLink = `${req.protocol}://localhost:3000/auth/reset-password/${token}`; // For frontend
        // const message = `Click the link to reset your password:\n${resetLink}\nThis link will expire in 15 minutes.`;
    
        await sendEmail(user.email, "Reset Your Password ", passwordResetTemplate(resetLink));
    
        res.status(200).json({ message: "Password reset link sent to your email" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: (error as Error).message });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.params; // from the URL
        const { password, confirmPassword } = req.body;
    
        if (!token || !password || !confirmPassword) {
            res.status(400).json({ message: "All fields are required" });
            return;
        }
    
        if (password !== confirmPassword) {
            res.status(400).json({ message: "Passwords do not match" });
            return;
        }
    
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    
        const user = await USER.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
            isActive: true
        });
    
        if (!user) {
            res.status(400).json({ message: "Invalid or expired reset token" });
            return;
        }
    
        user.password = password;
        user.confirmPassword = confirmPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
    
        await user.save();
    
        res.status(200).json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: (error as Error).message });
    }
};

export const updatePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { currentPassword ,newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            res.status(400).json({ message: "All fields are required" });
            return;
        }

        const user = await USER.findOne({_id:req.user?._id,isActive:true,isVerified:true}).select('+password');
        if(!user){
            res.status(400).json({ message: "User not found" });
            return;
        }

        if(!await user.correctPassword(currentPassword,user.password)){
            res.status(400).json({ message: "Invalid current password" });
            return;
        }
    
        if (newPassword !== confirmNewPassword) {
            res.status(400).json({ message: "Passwords and confirm password should match" });
            return;
        }
        
        user.password = newPassword;
        user.confirmPassword = confirmNewPassword;
        await user.save();
    
        res.status(200).json({ message: "Password is updated" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: (error as Error).message });
    }
};

export const logout = async (req:Request,res:Response): Promise<void> => {
    try {
        res.clearCookie('token',{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        })

        res.status(200).json({message:'Logged out successfully'})
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: (error as Error).message });
    }
}