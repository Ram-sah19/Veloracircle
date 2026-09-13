const { ROLE_HIERARCHY, ROLES } = require('../config/constants');

/**
 * Restrict access to users possessing at least one of the allowed roles
 * or satisfying the role hierarchy level.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

/**
 * Require at least a certain role level in the hierarchy
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires at least '${minRole}' privileges.`,
      });
    }

    next();
  };
};

module.exports = { authorize, requireMinRole, ROLES };
