import { Unkey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY || '' });
const uk_api_id = process.env.UNKEY_API_ID || '';

export { unkey, uk_api_id };