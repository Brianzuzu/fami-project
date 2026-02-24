// ⚠️ This file has been moved to ../../services/api.ts
// It is intentionally left here (with a dummy default export) so Expo Router
// does not warn about a missing default export when scanning app/.
// All real imports should use: import { callBackend } from '../../services/api'

export { callBackend } from '../services/api';

// Dummy default export to satisfy Expo Router's route-file validator
export default function _ApiShim() { return null; }
