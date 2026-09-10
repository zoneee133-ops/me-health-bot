import {createContext, useContext} from 'react';
import {ru, Copy} from './copy';

const CopyContext = createContext<Copy>(ru);
export const CopyProvider = CopyContext.Provider;
export const useCopy = () => useContext(CopyContext);
