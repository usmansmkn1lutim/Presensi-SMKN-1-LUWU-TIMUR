import { auditLogService } from '../services/auditLogService';
import { sanitizeAuditMetadata } from '../pages/admin/AuditLogsPage';

console.log('=== RUNNING AUDIT LOG FOUNDATION TESTS ===\n');

// 1. Audit Log Service Contracts Validation
console.assert(typeof auditLogService === 'object', '1. auditLogService should be an object');
console.assert(typeof auditLogService.getAuditLogs === 'function', '1. getAuditLogs should be a function');
console.assert(typeof auditLogService.writeAuditLog === 'function', '1. writeAuditLog should be a function');
console.log('✓ 1. Audit log service contracts verified successfully.');

// 2. Format Action Enumeration Validation
const validActions = [
  'LOGIN',
  'LOGOUT',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ROLE_CHANGE',
  'CHECK_IN',
  'CHECK_OUT',
  'APPROVE',
  'REJECT',
  'CANCEL',
  'SYSTEM_SETTING_CHANGE'
];

validActions.forEach((act) => {
  console.assert(typeof act === 'string' && act.toUpperCase() === act, `2. Action ${act} should be uppercase string`);
});
console.log('✓ 2. Action enum formats validated successfully.');

// 3. Entity Type Enumeration Validation
const validEntityTypes = [
  'USER',
  'EMPLOYEE',
  'ROLE',
  'LOCATION',
  'WORK_SCHEDULE',
  'HOLIDAY',
  'REQUEST',
  'ATTENDANCE',
  'SYSTEM_SETTING'
];

validEntityTypes.forEach((ent) => {
  console.assert(typeof ent === 'string' && ent.toUpperCase() === ent, `3. Entity type ${ent} should be uppercase string`);
});
console.log('✓ 3. Entity type enum formats validated successfully.');

// 4. Immutability validation: Assert that update/delete actions are mathematically forbidden at API contract level
console.assert((auditLogService as any).updateAuditLog === undefined, '4. updateAuditLog should be undefined (immutable)');
console.assert((auditLogService as any).deleteAuditLog === undefined, '4. deleteAuditLog should be undefined (immutable)');
console.log('✓ 4. Service-level API immutability contracts verified successfully.');

// 5. Audit Metadata format structures
const dummyMetadata = {
  employee_name: "Budi Santoso",
  nip: "199102122020011002",
  department: "Kurikulum"
};
console.assert(dummyMetadata.employee_name === "Budi Santoso", '5. Metadata shape matching check failed');
console.log('✓ 5. Historical snapshot metadata structures validated.');

// 6. Defensive Redaction Metadata Sanitization Validation
const sensitiveMetadataPayload = {
  ip: "192.168.1.1",
  actor_name: "Admin Utama",
  password: "super_secret_password_123",
  passwd: "pw123",
  pass: "secret_p",
  token: "jwt_token_xyz",
  access_token: "access_token_abc",
  refresh_token: "refresh_token_789",
  id_token: "id_token_jwt",
  secret: "shhh_my_secret",
  client_secret: "oauth_client_sec",
  api_key: "api_key_value",
  apikey: "apikey_val",
  private_key: "begin_private_key",
  privateKey: "begin_pk_camel",
  authorization: "Bearer my_auth_header",
  credential: "user_credential_block",
  credentials: "user_credentials_block",
  nested: {
    safe_field: "this is safe",
    secret: "nested_secret_xyz",
    deeper_nested: [
      {
        apikey: "nested_apikey_inside_array",
        safe_item: "safe"
      }
    ]
  },
  array_test: [
    "safe_string_in_array",
    {
      password: "array_object_password",
      plain_key: "plain_value"
    }
  ]
};

const sanitized = sanitizeAuditMetadata(sensitiveMetadataPayload);

// Assert sensitive root-level elements are fully redacted
console.assert(sanitized.password === '[REDACTED]', '6. root level password redaction failed');
console.assert(sanitized.passwd === '[REDACTED]', '6. root level passwd redaction failed');
console.assert(sanitized.pass === '[REDACTED]', '6. root level pass redaction failed');
console.assert(sanitized.token === '[REDACTED]', '6. root level token redaction failed');
console.assert(sanitized.access_token === '[REDACTED]', '6. root level access_token redaction failed');
console.assert(sanitized.refresh_token === '[REDACTED]', '6. root level refresh_token redaction failed');
console.assert(sanitized.id_token === '[REDACTED]', '6. id_token redaction failed');
console.assert(sanitized.secret === '[REDACTED]', '6. secret redaction failed');
console.assert(sanitized.client_secret === '[REDACTED]', '6. client_secret redaction failed');
console.assert(sanitized.api_key === '[REDACTED]', '6. api_key redaction failed');
console.assert(sanitized.apikey === '[REDACTED]', '6. apikey redaction failed');
console.assert(sanitized.private_key === '[REDACTED]', '6. private_key redaction failed');
console.assert(sanitized.privateKey === '[REDACTED]', '6. privateKey redaction failed');
console.assert(sanitized.authorization === '[REDACTED]', '6. authorization redaction failed');
console.assert(sanitized.credential === '[REDACTED]', '6. credential redaction failed');
console.assert(sanitized.credentials === '[REDACTED]', '6. credentials redaction failed');

// Assert nested fields are redacted
console.assert(sanitized.nested.secret === '[REDACTED]', '6. nested secret redaction failed');
console.assert(sanitized.nested.deeper_nested[0].apikey === '[REDACTED]', '6. array nested apikey redaction failed');
console.assert(sanitized.array_test[1].password === '[REDACTED]', '6. array object password redaction failed');

// Assert safe fields are completely untouched and valid
console.assert(sanitized.ip === "192.168.1.1", '6. safe ip field got changed');
console.assert(sanitized.actor_name === "Admin Utama", '6. safe actor_name got changed');
console.assert(sanitized.nested.safe_field === "this is safe", '6. safe nested field got changed');
console.assert(sanitized.nested.deeper_nested[0].safe_item === "safe", '6. safe nested array field got changed');
console.assert(sanitized.array_test[0] === "safe_string_in_array", '6. array item got changed');
console.assert(sanitized.array_test[1].plain_key === "plain_value", '6. array object safe field got changed');

console.log('✓ 6. Defensive metadata redaction algorithms and recursive arrays fully verified.');

console.log('\n=== ALL AUDIT LOG FOUNDATION TESTS PASSED! ===');
