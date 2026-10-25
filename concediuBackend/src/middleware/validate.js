const { validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    // Interfața afișează doar `message`, deci mesajul conține motivele concrete.
    const reasons = [...new Set(extractedErrors.map((e) => e.message))];
    return res.status(422).json({
      message: reasons.join('; ') || 'Validation failed',
      errors: extractedErrors,
    });
  };
};

module.exports = validate;
