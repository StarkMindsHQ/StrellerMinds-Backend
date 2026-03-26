/**
 * Validation message keys for localization
 * These keys map to translations in i18n files
 */
export const ValidationMessageKeys = {
  // Required field
  REQUIRED: 'validation.required',
  
  // String validations
  MIN_LENGTH: 'validation.minLength',
  MAX_LENGTH: 'validation.maxLength',
  EXACT_LENGTH: 'validation.exactLength',
  STRING_FORMAT: 'validation.stringFormat',
  
  // Email
  EMAIL: 'validation.email',
  
  // Password
  PASSWORD_STRONG: 'validation.passwordStrong',
  PASSWORD_MATCH: 'validation.passwordMatch',
  
  // Number validations
  MIN_VALUE: 'validation.minValue',
  MAX_VALUE: 'validation.maxValue',
  POSITIVE_NUMBER: 'validation.positiveNumber',
  INTEGER: 'validation.integer',
  
  // Date validations
  DATE: 'validation.date',
  DATE_FUTURE: 'validation.dateFuture',
  DATE_PAST: 'validation.datePast',
  DATE_FORMAT: 'validation.dateFormat',
  
  // URL and phone
  URL: 'validation.url',
  PHONE: 'validation.phone',
  
  // Enum/Select
  ENUM: 'validation.enum',
  
  // Array
  ARRAY_NOT_EMPTY: 'validation.arrayNotEmpty',
  ARRAY_MAX_SIZE: 'validation.arrayMaxSize',
  ARRAY_MIN_SIZE: 'validation.arrayMinSize',
  
  // Boolean
  BOOLEAN: 'validation.boolean',
  
  // Username
  USERNAME_FORMAT: 'validation.usernameFormat',
  USERNAME_TAKEN: 'validation.usernameTaken',
  
  // Slug
  SLUG_FORMAT: 'validation.slugFormat',
  
  // File
  FILE_SIZE: 'validation.fileSize',
  FILE_TYPE: 'validation.fileType',
  FILE_REQUIRED: 'validation.fileRequired',
  
  // Custom
  ALPHANUMERIC: 'validation.alphanumeric',
  CREDIT_CARD: 'validation.creditCard',
  POSTAL_CODE: 'validation.postalCode',
  LATITUDE: 'validation.latitude',
  LONGITUDE: 'validation.longitude',
  
  // Conditional
  REQUIRED_IF: 'validation.requiredIf',
  CONDITIONAL_REQUIRED: 'validation.conditionalRequired',
} as const;

/**
 * Field labels for user-friendly display
 * Maps field names to human-readable labels
 */
export const ValidationFieldLabels: Record<string, string> = {
  // Auth fields
  email: 'Email address',
  password: 'Password',
  confirmPassword: 'Password confirmation',
  currentPassword: 'Current password',
  newPassword: 'New password',
  username: 'Username',
  firstName: 'First name',
  lastName: 'Last name',
  fullName: 'Full name',
  phoneNumber: 'Phone number',
  
  // User fields
  bio: 'Biography',
  avatar: 'Profile picture',
  dateOfBirth: 'Date of birth',
  address: 'Address',
  city: 'City',
  country: 'Country',
  postalCode: 'Postal code',
  timezone: 'Timezone',
  language: 'Language',
  
  // Course fields
  title: 'Title',
  description: 'Description',
  content: 'Content',
  price: 'Price',
  currency: 'Currency',
  duration: 'Duration',
  startDate: 'Start date',
  endDate: 'End date',
  deadline: 'Deadline',
  capacity: 'Capacity',
  thumbnail: 'Thumbnail image',
  video: 'Video',
  thumbnailUrl: 'Thumbnail URL',
  videoUrl: 'Video URL',
  
  // Assignment fields
  assignment: 'Assignment',
  submission: 'Submission',
  grade: 'Grade',
  feedback: 'Feedback',
  dueDate: 'Due date',
  submittedAt: 'Submission date',
  
  // Payment fields
  cardNumber: 'Card number',
  cardHolder: 'Cardholder name',
  expiryDate: 'Expiry date',
  cvv: 'CVV',
  billingAddress: 'Billing address',
  amount: 'Amount',
  
  // File fields
  file: 'File',
  document: 'Document',
  image: 'Image',
  
  // Common fields
  name: 'Name',
  slug: 'Slug',
  status: 'Status',
  type: 'Type',
  category: 'Category',
  tags: 'Tags',
  url: 'URL',
  link: 'Link',
  notes: 'Notes',
  comment: 'Comment',
  message: 'Message',
  subject: 'Subject',
  body: 'Body',
  
  // Forum fields
  post: 'Post',
  thread: 'Thread',
  reply: 'Reply',
  
  // Generic
  id: 'ID',
  uuid: 'UUID',
  code: 'Code',
  token: 'Token',
  key: 'Key',
  value: 'Value',
  data: 'Data',
  settings: 'Settings',
  preferences: 'Preferences',
};

/**
 * Default validation messages (English)
 * Used as fallback when i18n is not available
 */
export const DefaultValidationMessages: Record<string, string> = {
  [ValidationMessageKeys.REQUIRED]: '{{field}} is required. Please provide a value.',
  [ValidationMessageKeys.MIN_LENGTH]: '{{field}} must be at least {{min}} characters long.',
  [ValidationMessageKeys.MAX_LENGTH]: '{{field}} cannot exceed {{max}} characters.',
  [ValidationMessageKeys.EXACT_LENGTH]: '{{field}} must be exactly {{length}} characters.',
  [ValidationMessageKeys.STRING_FORMAT]: '{{field}} has an invalid format.',
  
  [ValidationMessageKeys.EMAIL]: 'Please enter a valid email address (e.g., user@example.com).',
  
  [ValidationMessageKeys.PASSWORD_STRONG]: '{{field}} must be at least 8 characters and include uppercase letters, lowercase letters, and numbers.',
  [ValidationMessageKeys.PASSWORD_MATCH]: 'Passwords do not match. Please ensure both password fields are identical.',
  
  [ValidationMessageKeys.MIN_VALUE]: '{{field}} must be at least {{min}}.',
  [ValidationMessageKeys.MAX_VALUE]: '{{field}} cannot exceed {{max}}.',
  [ValidationMessageKeys.POSITIVE_NUMBER]: '{{field}} must be a positive number.',
  [ValidationMessageKeys.INTEGER]: '{{field}} must be a whole number.',
  
  [ValidationMessageKeys.DATE]: 'Please enter a valid date for {{field}}.',
  [ValidationMessageKeys.DATE_FUTURE]: '{{field}} must be a date in the future.',
  [ValidationMessageKeys.DATE_PAST]: '{{field}} must be a date in the past.',
  [ValidationMessageKeys.DATE_FORMAT]: '{{field}} must be in {{format}} format.',
  
  [ValidationMessageKeys.URL]: 'Please enter a valid URL for {{field}} (e.g., https://example.com).',
  [ValidationMessageKeys.PHONE]: 'Please enter a valid phone number for {{field}}.',
  
  [ValidationMessageKeys.ENUM]: '{{field}} must be one of: {{values}}.',
  
  [ValidationMessageKeys.ARRAY_NOT_EMPTY]: '{{field}} must contain at least one item.',
  [ValidationMessageKeys.ARRAY_MAX_SIZE]: '{{field}} cannot contain more than {{max}} items.',
  [ValidationMessageKeys.ARRAY_MIN_SIZE]: '{{field}} must contain at least {{min}} items.',
  
  [ValidationMessageKeys.BOOLEAN]: '{{field}} must be true or false.',
  
  [ValidationMessageKeys.USERNAME_FORMAT]: '{{field}} can only contain letters, numbers, underscores, and hyphens (3-30 characters).',
  [ValidationMessageKeys.USERNAME_TAKEN]: 'This username is already taken. Please choose another one.',
  
  [ValidationMessageKeys.SLUG_FORMAT]: '{{field}} can only contain lowercase letters, numbers, and hyphens.',
  
  [ValidationMessageKeys.FILE_SIZE]: '{{field}} is too large. Maximum allowed size is {{max}}.',
  [ValidationMessageKeys.FILE_TYPE]: '{{field}} has an unsupported file type. Allowed types: {{types}}.',
  [ValidationMessageKeys.FILE_REQUIRED]: 'Please upload a file for {{field}}.',
  
  [ValidationMessageKeys.ALPHANUMERIC]: '{{field}} can only contain letters and numbers.',
  [ValidationMessageKeys.CREDIT_CARD]: 'Please enter a valid credit card number.',
  [ValidationMessageKeys.POSTAL_CODE]: 'Please enter a valid postal code.',
  [ValidationMessageKeys.LATITUDE]: '{{field}} must be a valid latitude (-90 to 90).',
  [ValidationMessageKeys.LONGITUDE]: '{{field}} must be a valid longitude (-180 to 180).',
  
  [ValidationMessageKeys.REQUIRED_IF]: '{{field}} is required when {{condition}}.',
  [ValidationMessageKeys.CONDITIONAL_REQUIRED]: '{{field}} is required based on your selection.',
};

/**
 * Password strength requirements description
 */
export const PasswordRequirementsMessage = `Your password must:
• Be at least 8 characters long
• Include at least one uppercase letter (A-Z)
• Include at least one lowercase letter (a-z)
• Include at least one number (0-9)
• Optionally include special characters (!@#$%^&*)`;

/**
 * Username requirements description
 */
export const UsernameRequirementsMessage = `Your username must:
• Be 3-30 characters long
• Use only letters, numbers, underscores (_), and hyphens (-)
• Not start or end with a hyphen or underscore`;

/**
 * Email validation regex pattern
 */
export const EmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Username validation regex pattern
 */
export const UsernamePattern = /^[a-zA-Z0-9_-]{3,30}$/;

/**
 * Slug validation regex pattern
 */
export const SlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Phone number validation regex pattern
 */
export const PhonePattern = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/;

/**
 * Password strength regex pattern
 * Requires: 8+ chars, uppercase, lowercase, number
 */
export const StrongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
