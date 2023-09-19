import { LightningElement, api, wire, track } from 'lwc';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub'
import { CurrentPageReference } from 'lightning/navigation'
import { getRecordNotifyChange } from 'lightning/uiRecordApi'
import getFileDataFromId from '@salesforce/apex/PDFTron_ContentVersionController.getAttachments';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'

export default class PdftronFlowFileFlattener extends LightningElement {

    @api flattenfile = false;
    @api recordId;
    @track docLoaded = false;
    @track isLoading = false;

    @track currentStatus = '';
    @track currentProfile = '';

    @track showButtons = false;

    @wire(CurrentPageReference)
    pageRef;
    fileName;

    attachments;



    connectedCallback() {
      registerListener('finishFlatten', this.flattenCompletedDocument, this);
    }

    renderedCallback() {
      
    }


    handleFlatten(event) {
        this.isLoading = true;
        let status = event.target.dataset.status; //get status API value from data-status attribute

        this.currentStatus = status;

        fireEvent(this.pageRef, 'flattenfile', this.currentStatus);

        
        
    }

    flattenCompletedDocument(payload){
      this.isLoading= payload;
      this.showButtons = payload;
    }

    showNotification (title, message, variant) {
      const evt = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
      })
      this.dispatchEvent(evt)
    }
}