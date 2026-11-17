                                                                                               
                                                                                                     
                                                                                               
                                                                                                    
const g = globalThis as unknown as { document?: { baseURI: string }; registration?: { scope: string } };
export const BASE_URL = new URL(g.document?.baseURI ?? g.registration!.scope).pathname;
