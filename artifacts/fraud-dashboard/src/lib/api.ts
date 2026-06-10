import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => {
  return localStorage.getItem("fraud_token");
});
