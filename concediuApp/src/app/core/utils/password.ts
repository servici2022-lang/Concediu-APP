import { Validators } from '@angular/forms';

/**
 * Aceleași reguli ca în backend (validators/*.validator.js): minim 8 caractere, cu literă
 * mare, literă mică și cifră. Altfel o parolă ca „abcdefgh” trecea de formular și era
 * respinsă abia de server.
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const PASSWORD_HINT = 'Minim 8 caractere, cu litera mare, litera mica si cifra.';

export const passwordValidators = [Validators.required, Validators.pattern(PASSWORD_PATTERN)];
