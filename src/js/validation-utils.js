/**
 * Validation utilities for form inputs
 */

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// Phone validation (basic US format)
function validatePhone(phone) {
    const re = /^[\d\s\-\(\)]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length === 10;
}

// Required field validation
function validateRequired(value) {
    return value !== null && value !== undefined && value.trim() !== '';
}

// Length validation
function validateLength(value, min, max) {
    const len = value ? value.length : 0;
    return len >= min && len <= max;
}

// Show validation error
function showError(input, message) {
    const formGroup = input.closest('.form-group, .input-group, .mb-3');
    if (formGroup) {
        let errorDiv = formGroup.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            formGroup.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        input.classList.add('is-invalid');
    }
}

// Clear validation error
function clearError(input) {
    const formGroup = input.closest('.form-group, .input-group, .mb-3');
    if (formGroup) {
        const errorDiv = formGroup.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.textContent = '';
        }
        input.classList.remove('is-invalid');
    }
}
