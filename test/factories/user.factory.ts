import { User } from '../../src/user/entities/user.entity';
import { UserProfile } from '../../src/user/entities/user-profile.entity';
import { nextId, DeepPartial, FactoryFn } from './shared';

// ──────────────────────────────────────────────
// User factory
// ──────────────────────────────────────────────

/**
 * Default values mirror the User entity columns.
 * Each call produces a unique email via an auto-incrementing counter.
 */
const defaultUser = {
  email: (n: number) => `user-${n}@strellerminds.test`,
  password: 'HashedP@ssw0rd!',
  firstName: (n: number) => `First${n}`,
  lastName: (n: number) => `Last${n}`,
  isActive: true,
};

/**
 * Create a User entity instance with auto-generated unique values.
 * Pass a partial override object to customize specific fields.
 *
 * @example
 * const user = createUser({ email: 'custom@test.com' });
 * const admin = createUser({ firstName: 'Admin', isActive: false });
 */
export const createUser: FactoryFn<User> = (overrides?: DeepPartial<User>): User => {
  const n = nextId('user');
  return Object.assign(new User(), {
    email: defaultUser.email(n),
    password: defaultUser.password,
    firstName: defaultUser.firstName(n),
    lastName: defaultUser.lastName(n),
    isActive: defaultUser.isActive,
    ...overrides,
  });
};

/**
 * Create a plain object representation of a user (no class instance).
 * Useful for POST request payloads where the API expects a DTO, not an entity.
 */
export const createUserData = (
  overrides?: DeepPartial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>,
) => {
  const n = nextId('user');
  return {
    email: defaultUser.email(n),
    password: defaultUser.password,
    firstName: defaultUser.firstName(n),
    lastName: defaultUser.lastName(n),
    isActive: defaultUser.isActive,
    ...overrides,
  };
};

/**
 * Build many users at once. Each gets a unique counter.
 * Pass an array of partial overrides — or omit to create `count` default users.
 */
export const createManyUsers = (
  count: number,
  overridesArray?: DeepPartial<User>[],
): User[] => {
  const users: User[] = [];
  for (let i = 0; i < count; i++) {
    users.push(createUser(overridesArray?.[i]));
  }
  return users;
};

// ──────────────────────────────────────────────
// UserProfile factory
// ──────────────────────────────────────────────

/**
 * Create a UserProfile entity. Set `userId` via overrides to link to a user.
 */
export const createUserProfile: FactoryFn<UserProfile> = (
  overrides?: DeepPartial<UserProfile>,
): UserProfile => {
  const n = nextId('profile');
  return Object.assign(new UserProfile(), {
    userId: undefined as string | undefined, // must be set by caller or overrides
    bio: `Bio for profile ${n}`,
    avatar: `https://api.strellerminds.test/avatars/profile-${n}.png`,
    ...overrides,
  });
};

/**
 * Convenience: create a User + linked UserProfile in one call.
 * The profile's `userId` is set to the user's `id` if available.
 */
export const createUserWithProfile = (
  userOverrides?: DeepPartial<User>,
  profileOverrides?: DeepPartial<UserProfile>,
): { user: User; profile: UserProfile } => {
  const user = createUser(userOverrides);
  const profile = createUserProfile({
    userId: user.id ?? undefined,
    ...profileOverrides,
  });
  return { user, profile };
};
