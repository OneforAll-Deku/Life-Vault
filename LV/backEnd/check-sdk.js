
import { AccountAddress } from '@aptos-labs/ts-sdk';

if (AccountAddress) {
    const methods = Object.getOwnPropertyNames(AccountAddress);
    console.log('AccountAddress static methods:', methods.join(', '));
} else {
    console.log('AccountAddress is undefined');
}
