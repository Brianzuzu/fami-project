/**
 * Validation utilities for Cloud Functions
 */

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
    // Kenyan phone number format: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
    const phoneRegex = /^(\+254|0)[17]\d{8}$/;
    return phoneRegex.test(phone);
}

export function validateAmount(amount: number): boolean {
    return amount > 0 && Number.isFinite(amount);
}

export function validatePoolData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 3) {
        errors.push("Pool name must be at least 3 characters");
    }

    if (!data.category) {
        errors.push("Pool category is required");
    }

    if (!data.description || data.description.trim().length < 10) {
        errors.push("Pool description must be at least 10 characters");
    }

    if (!data.location || data.location.trim().length < 3) {
        errors.push("Pool location is required");
    }

    if (!validateAmount(data.targetAmount)) {
        errors.push("Valid target amount is required");
    }

    if (!data.duration) {
        errors.push("Pool duration is required");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateInvestmentData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.poolId) {
        errors.push("Pool ID is required");
    }

    if (!validateAmount(data.amount)) {
        errors.push("Valid investment amount is required");
    }

    if (data.amount < 1000) {
        errors.push("Minimum investment amount is KES 1,000");
    }

    if (!data.contractType || !['standard', 'revenue'].includes(data.contractType)) {
        errors.push("Valid contract type is required");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate loan application data
 */
export function validateLoanData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!validateAmount(data.amount)) {
        errors.push("Valid loan amount is required");
    }

    if (data.amount < 5000) {
        errors.push("Minimum loan amount is KES 5,000");
    }

    if (!data.purpose || data.purpose.trim().length < 5) {
        errors.push("Loan purpose must be at least 5 characters");
    }

    if (!data.description || data.description.trim().length < 10) {
        errors.push("Loan description must be at least 10 characters");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
