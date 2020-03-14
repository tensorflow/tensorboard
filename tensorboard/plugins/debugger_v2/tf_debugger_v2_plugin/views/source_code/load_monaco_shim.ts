
declare const require: any;

const VS_PATH_PREFIX = 'vs';
const VS_IMPORT_PATH = '/tf-imports/vs';

export function loadMonaco(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if ((window as any)['monaco']) {
      console.log('20:');  // DEBUG
      resolve();
    }

    require.config({
      paths: {
        [VS_PATH_PREFIX]: VS_IMPORT_PATH
      },
      catchError: true,
    });

    require([`${VS_PATH_PREFIX}/editor/editor.main`], function (monaco: any) {
      require([`${VS_PATH_PREFIX}/python/python.contribution`], () => {
        console.log('100: monaco=', monaco);  // DEBUG
        console.log('100: window.monaco:', (window as any)["monaco"]);  // DEBUG
        resolve();
      });
    });
  });
}
