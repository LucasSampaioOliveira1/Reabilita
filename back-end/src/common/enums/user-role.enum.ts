export const USER_ROLES = ['patient', 'physio'] as const;

export type UserRole = (typeof USER_ROLES)[number];
