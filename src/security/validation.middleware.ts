import { body, validationResult } from "express-validator";
import xss from "xss";

export const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Sanitize all inputs
    Object.keys(req.body).forEach((key) => {
      req.body[key] = xss(req.body[key]);
    });

    next();
  },
];