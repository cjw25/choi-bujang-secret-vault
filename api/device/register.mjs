import { handleDeviceRegister } from '../../src/device-flow.mjs';

export default function handler(request, response) {
  return handleDeviceRegister(request, response);
}
