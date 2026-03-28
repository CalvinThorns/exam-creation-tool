export function isStrongPassword(value) {
  const password = String(value || "");
  return /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

export function getPasswordRequirementChecks(value) {
  const password = String(value || "");

  return {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}
