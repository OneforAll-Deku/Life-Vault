
import * as AptosSDK from '@aptos-labs/ts-sdk';

console.log('SDK Keys:', Object.keys(AptosSDK).slice(0, 20));
if (AptosSDK.AccountAddress) {
    console.log('AccountAddress Methods:', Object.getOwnPropertyNames(AptosSDK.AccountAddress));
} else {
    console.log('AccountAddress is missing');
}
