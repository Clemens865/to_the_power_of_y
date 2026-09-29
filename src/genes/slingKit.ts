import adapterSource from './slingButton.tsx?raw';
import adapterCss from './slingButton.css?raw';

/** Only original adapter source ships in the kit; React Bits stays an official install. */
export const slingKitFiles = () => ({
  'slingButton.tsx': adapterSource.replace("'../vendor/react-bits/SlingButton/SlingButton'", "'./components/SlingButton/SlingButton'"),
  'slingButton.css': adapterCss
});
