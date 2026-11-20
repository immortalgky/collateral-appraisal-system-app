import { createContext } from 'react';

/**
 * True under a `PropertyFormShell` that draws the property name in its header: the detail forms
 * then leave their own `propertyName` field out. Outside a shell (Data Correction) it stays false
 * and the field stays in the form.
 */
export const PropertyNameInHeaderContext = createContext(false);
