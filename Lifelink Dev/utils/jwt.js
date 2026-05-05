import jwt from "jsonwebtoken";
import "dotenv/config";

const SECRET = process.env.JWT_SECRET;

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    SECRET,
    { expiresIn: "2h" }
  );
};

export const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};