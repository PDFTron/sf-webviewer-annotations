import { LightningElement, api, wire, track } from 'lwc';
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub'
import { CurrentPageReference } from 'lightning/navigation'
import { getRecordNotifyChange } from 'lightning/uiRecordApi'
// import updateRoundStatus from '@salesforce/apex/PDFTron_ContentVersionController.updateRoundStatus';

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

    connectedCallback() {
    }

    renderedCallback() {
    }


    handleFlatten(event) {
        this.isLoading = true;
        let status = event.target.dataset.status; //get status API value from data-status attribute

        this.currentStatus = status;
        // updateRoundStatus({recordId: this.recordId, status}).then(response => {
        //     getRecordNotifyChange([{recordId: this.recordId}]);
        //     console.log(`Successfully updated ${this.recordId} status to ${status}`);
        //     this.isLoading = false;
        //     this.showButtons = false;
        //   })
        //   .catch(error => {
        //     console.error(error)
        //     this.isLoading = false;
        //   });

        //   fireEvent(this.pageRef, 'flattenfile', this.currentStatus);
    }
}