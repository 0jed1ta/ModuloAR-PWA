                                                                                                  
                                                                                                     
import { bootstrapApplication } from "@angular/platform-browser";
import { isDevMode } from "@angular/core";
import { App } from "./app/app";
import { appConfig } from "./app/app.config";

bootstrapApplication(App, appConfig)
  .then((app) => {
                                                                                                             
    if (isDevMode()) (window as unknown as { __atlas: { destruir: () => void } }).__atlas = { destruir: () => app.destroy() };
  })
  .catch((err) => console.error(err));
