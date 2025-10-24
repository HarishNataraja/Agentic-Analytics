import { User } from '../types';

// In a real app, this would be a secure HttpOnly cookie or other secure storage.
// Using localStorage for this demo for simplicity to persist session across reloads.
const USER_KEY = 'auth_user';
const TOKEN_KEY = 'auth_token';

// Mock database of users. In a real app, this would be a database.
const MOCK_USERS: { [email: string]: { id: string, email: string, hashedPassword: string } } = {
    // Pre-seed a user for easy testing
    'user@example.com': { id: '1', email: 'user@example.com', hashedPassword: 'hashed_password123' }
};

/**
 * Simulates a user signup API call.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves to the new user object.
 */
export const signup = async (email: string, password: string): Promise<User> => {
    // Simulate API call delay
    await new Promise(res => setTimeout(res, 500));

    if (MOCK_USERS[email]) {
        throw new Error('User with this email already exists.');
    }
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
    }


    // In a real backend, you would securely hash the password here.
    const newUser = {
        id: Date.now().toString(),
        email,
        hashedPassword: `hashed_${password}` // Mock hashing for demo purposes.
    };
    MOCK_USERS[email] = newUser;

    const userForClient: User = { id: newUser.id, email: newUser.email };
    const mockToken = `mock_token_${newUser.id}_${Date.now()}`;

    localStorage.setItem(USER_KEY, JSON.stringify(userForClient));
    localStorage.setItem(TOKEN_KEY, mockToken);

    return userForClient;
};

/**
 * Simulates a user login API call.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves to the logged-in user object.
 */
export const login = async (email: string, password: string): Promise<User> => {
    // Simulate API call delay
    await new Promise(res => setTimeout(res, 500));

    const existingUser = MOCK_USERS[email];
    // In a real backend, you would securely compare the hashed password.
    if (!existingUser || existingUser.hashedPassword !== `hashed_${password}`) {
        throw new Error('Invalid email or password.');
    }

    const userForClient: User = { id: existingUser.id, email: existingUser.email };
    const mockToken = `mock_token_${existingUser.id}_${Date.now()}`;
    
    localStorage.setItem(USER_KEY, JSON.stringify(userForClient));
    localStorage.setItem(TOKEN_KEY, mockToken);

    return userForClient;
};

/**
 * Logs out the current user by clearing session data from localStorage.
 */
export const logout = (): void => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
};

/**
 * Retrieves the current user from localStorage if a session exists.
 * @returns The current user object or null if not authenticated.
 */
export const getCurrentUser = (): User | null => {
    const userJson = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (userJson && token) {
        try {
            return JSON.parse(userJson) as User;
        } catch (e) {
            // If parsing fails, clear the invalid data
            logout();
            return null;
        }
    }
    return null;
};
