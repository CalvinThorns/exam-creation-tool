function createAuthController({ authService }) {
  return {
    login: async (req, res) => {
      try {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ message: 'E-Mail and password is required' });
        }

        const result = await authService.login(email, password);
        res.status(200).json(result);
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    },
    register: async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    
    // 201 Created Statuscode zurückgeben
    res.status(201).json({ 
      data: { 
        message: "Erfolgreich registriert", 
        user 
      } 
    });
  } catch (err) {
    next(err);
  }
},
  };
}

module.exports = { createAuthController };