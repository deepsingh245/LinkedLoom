export interface AuthResponse {
    access_token: string;
    user: {
        id: string;
        email: string;
        name?: string;
    };
}

export interface ApiError {
    message: string;
    statusCode: number;
}
