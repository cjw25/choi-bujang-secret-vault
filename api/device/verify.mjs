import { handleDeviceVerify } from '../../src/device-flow.mjs';

export default function handler(request, response) {
  return handleDeviceVerify(request, response);
}
