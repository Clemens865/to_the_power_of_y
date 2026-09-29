import adapterSource from './holdButton.tsx?raw';
import adapterCss from './holdButton.css?raw';

/** Export only our adapter; the restricted component stays an official registry install. */
export const holdKitFiles = () => ({
  'holdButton.tsx': adapterSource.replace("'../vendor/react-bits/HoldButton/HoldButton'", "'./components/HoldButton/HoldButton'"),
  'holdButton.css': adapterCss
});
