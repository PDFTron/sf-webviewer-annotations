import { LightningElement, wire, track, api } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import libUrl from '@salesforce/resourceUrl/lib';
import myfilesUrl from '@salesforce/resourceUrl/myfiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import mimeTypes from './mimeTypes'
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub';
import saveDocument from '@salesforce/apex/PDFTron_ContentVersionController.flattenDocument';
import getUser from '@salesforce/apex/PDFTron_ContentVersionController.getUser';
import getAnnotations from '@salesforce/apex/PDFTron_ContentVersionController.getAnnotations';
import saveAnnotations from '@salesforce/apex/PDFTron_ContentVersionController.saveAnnotations';
import { getRecordNotifyChange } from 'lightning/uiRecordApi'
// import updateRoundStatus from '@salesforce/apex/PDFTron_ContentVersionController.updateRoundStatus';
// import saveErrorLog from '@salesforce/apex/PDFTron_ContentVersionController.saveErrorLog';

function _base64ToArrayBuffer(base64) {
  var binary_string =  window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++)        {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export default class PdftronWvInstance extends LightningElement {
  //initialization options
  @api flattenfile = false;
  @track flattenFlag = false;
  @track documentLoaded = false;
  @track viewerLoaded = false;

  @track isFinal = false;

  fullAPI = true;
  enableRedaction = true;
  enableFilePicker = true;
  iframeWindow;

  @track uiInitialized = false;

  source = 'My file';
  @api recordId;

  @wire(CurrentPageReference)
  pageRef;

  username;
  @track currentDocId = '';
  fetchAnnots = false;
  lastRefresh = '';
  status;

  connectedCallback() { 
    
    //alert(`connectedCallback:  ${this.recordId}`) 
    //alert(window.location)

    window.addEventListener("beforeunload", this.beforeUnloadHandler.bind(this), false);
     registerListener('blobSelected', this.handleBlobSelected, this);
     registerListener('closeDocument', this.closeDocument, this);
     registerListener('downloadDocument', this.downloadDocument, this);
     registerListener('flattenfile', this.flattenCompletedDocument, this);
     window.addEventListener('message', this.handleReceiveMessage.bind(this), false);
  }
  
  disconnectedCallback() {

    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    //alert(`disconnectedCallback: ${this.recordId}`)
    unregisterAllListeners(this);
    window.removeEventListener('message', this.handleReceiveMessage, true);
  }

  beforeUnloadHandler(ev) {
    unregisterAllListeners(this);
    window.removeEventListener('message', this.handleReceiveMessage, true);
    console.log("beforeUnloadHandler called");
    window.removeEventListener("beforeunload", this.beforeUnloadHandler);
}

  handleBlobSelected(record) {
    this.currentDocId = record.cv.Id;

    const blobby = new Blob([_base64ToArrayBuffer(record.body)], {
      type: mimeTypes[record.FileExtension]
    });


    const payload = {
      blob: blobby,
      extension: record.cv.FileExtension,
      filename: record.cv.Title + "." + record.cv.FileExtension,
      documentId: record.cv.Id
    };

    this.iframeWindow.postMessage({ type: 'OPEN_DOCUMENT_BLOB', payload }, '*');
  }

  renderedCallback() {
    var self = this;

    if (this.uiInitialized) { 
        return;
    }

    Promise.all([
        loadScript(self, libUrl + '/webviewer.min.js')
    ])
    .then(() => this.handleInitWithCurrentUser())
    .catch(console.error);
  }

  showErrorMessage(error) {
    console.error(error);
  }

  handleInitWithCurrentUser() {

    getUser()
    .then((result) => {
        this.username = result;
        this.error = undefined;

        this.initUI();
    })
    .catch((error) => {
      console.error(error);
      this.showNotification('Error', error.body.message, 'error');
    });
  }

  showNotification (title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    })
    this.dispatchEvent(evt)
  }

  initUI() {
    console.log('inside initUI')
    var myObj = {
      libUrl: libUrl,
      fullAPI: this.fullAPI || false,
      namespacePrefix: '',
      username: this.username,
    };
    var url = myfilesUrl + '/webviewer-demo-annotated.pdf';

    const viewerElement = this.template.querySelector('div')
    // eslint-disable-next-line no-unused-vars
    const viewer = new WebViewer({
      path: libUrl, // path to the PDFTron 'lib' folder on your server
      custom: JSON.stringify(myObj),
      backendType: 'ems',
      config: myfilesUrl + '/config_apex.js',
      fullAPI: this.fullAPI,
      enableFilePicker: this.enableFilePicker,
      enableRedaction: this.enableRedaction,
      enableMeasurement: this.enableMeasurement,
      enableOptimizedWorkers: false
      // l: 'YOUR_LICENSE_KEY_HERE',
    }, viewerElement);

    viewerElement.addEventListener('ready', () => {
      this.iframeWindow = viewerElement.querySelector('iframe').contentWindow;
    })

  }

  flattenCompletedDocument(payload) {
    console.log(payload);
    this.status = payload;
    this.iframeWindow.postMessage({type: 'FLATTEN_DOC', payload: payload}, '*');
  }

  handleReceiveMessage(event) {
    const me = this;
    if (event.isTrusted && typeof event.data === 'object') {
      switch (event.data.type) {
        case 'SAVE_DOCUMENT':
          this.showNotification('Save in progress', 'Your changes are being saved. Please do not close this window.', 'warning');
          
          console.log("recId: " , this.recordId);

          if(this.isFinal) {
            break;
          }
          

          const cvId = event.data.payload.contentDocumentId;

          if(!this.isFinal) {
            this.isFinal = true;
            saveDocument({ json: JSON.stringify(event.data.payload), recordId: this.recordId ? this.recordId : '', cvId: cvId })
            .then((response) => {
              
                // updateRoundStatus({recordId: this.recordId, status: this.status}).then( () => {
                getRecordNotifyChange([{recordId: this.recordId}]);
                this.showNotification(
                  'Success',
                  event.data.payload.filename,
                  'success'
                );
                fireEvent(this.pageRef, 'finishFlatten', false);
                console.log(`Successfully updated ${this.recordId} status to ${this.status}`);
                // })
                // .catch(error => {
                //   console.error(error);
                  
                //   this.isLoading = false;
                // });

                me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', response }, '*')
                fireEvent(this.pageRef, 'refreshOnSave', response);
            })
            .catch(error => {

                // saveErrorLog({errorMessage: error.body, source: "pdftronWvInstance.js"});

                me.iframeWindow.postMessage({ type: 'DOCUMENT_SAVED', error }, '*')
                fireEvent(this.pageRef, 'refreshOnSave', error);
                console.error(event.data.payload.contentDocumentId);
                console.error(JSON.stringify(error));
                // this.showNotification('Error', error.body, 'error')
            });
          }
          break;
        case 'VIEWER_LOADED':
          fireEvent(this.pageRef, 'viewerLoaded', '*');
          this.viewerLoaded = true;
          break;
        case 'DOCUMENT_LOADED':
          fireEvent(this.pageRef, 'documentLoaded', '*');
          this.documentLoaded = true;
          break;
        case 'LOAD_ANNOTATIONS':
          getAnnotations({ documentId: this.currentDocId }).then(result => {
            //console.log(`Loaded annotations: ${JSON.stringify(result)}`);
            fireEvent(this.pageRef, 'lastRefresh', '*');
            me.iframeWindow.postMessage({type: 'LOAD_ANNOTATIONS_FINISHED', result }, window.location.origin)
          }).catch(this.showErrorMessage)
          break;
        case 'SAVE_ANNOTATIONS':
          saveAnnotations(event.data.payload).then(response => {
            console.log('Saving annotations', response);
          })
          .catch(error => {
            console.error(error)
            this.showErrorMessage(error)
          });
          break;
        default:
          break;
      }
    }
  }

  downloadDocument() {
    this.iframeWindow.postMessage({type: 'DOWNLOAD_DOCUMENT' }, '*')
  }

  @api
  closeDocument() {
    this.fetchAnnots = false
    this.currentDocId = ''
    this.iframeWindow.postMessage({type: 'CLOSE_DOCUMENT' }, '*')
  }
}