const Joi = require("joi");

exports.signupSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string()
    .min(6)
    .max(30)
    .email({
      tlds: { allow: ["com", "net"] },
    })
    .required(),
  password: Joi.string().min(6).required().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")),
});

exports.signinSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(30)
    .email({
      tlds: { allow: ["com", "net"] },
    })
    .required(),
  password: Joi.string().min(6).required().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")),
});

exports.acceptCodeSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(30)
    .email({
      tlds: { allow: ["com", "net"] },
    })
    .required(),
  providedCode: Joi.number().required(),
});
