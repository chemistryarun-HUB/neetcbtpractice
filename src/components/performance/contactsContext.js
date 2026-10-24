import { createContext, useContext } from 'react'

// True on the faculty portal: faculty see performance but never a student's or
// parent's phone number, so every WhatsApp/contact control hides itself.
export const ContactsHiddenContext = createContext(false)
export const useContactsHidden = () => useContext(ContactsHiddenContext)
