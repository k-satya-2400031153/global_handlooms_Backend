import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // SECURITY FIX: No fallback.
            if (!process.env.JWT_SECRET) {
                console.error("CRITICAL: Missing JWT_SECRET during token verification.");
                return res.status(500).json({ error: "Server configuration error." });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // Attach the decoded payload (id, role) to the request
            next();
        } catch (error) {
            res.status(401).json({ error: "Not authorized, token failed or expired." });
        }
    } else {
        res.status(401).json({ error: "Not authorized, no token provided." });
    }
};

// Role-Based Access Control (RBAC) Guard
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Role (${req.user.role}) is not authorized to access this resource.`
            });
        }
        next();
    };
};