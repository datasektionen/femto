export interface TokenSet {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    token_type: string;
    expires_at: number;
}

export interface UserInfo {
    sub: string;          // Username (e.g., "armanmo")
    email: string;        // Email address (e.g., "armanmo@kth.se")
    email_verified: boolean;
    ugkthid?: string;     // Optional KTH ID
    pls_admin?: boolean;  // Permission claims
    pls_user?: boolean;
    [key: string]: any;   // Allow for other pls_* claims
}

// ta bort kanske
export interface DfunktMandate {
    start: string;
    end: string;
    role: {
        identifier: string;
        title: string;
        description: string;
    };
}

//ta bort kanske
export interface DfunktUser {
    mandates: DfunktMandate[];
    first_name: string;
    last_name: string;
    kthid: string;
    ugkthid: string;
}