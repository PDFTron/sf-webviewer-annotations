import { LightningElement, track, wire, api } from 'lwc'
import { CurrentPageReference } from 'lightning/navigation'
import { fireEvent, registerListener, unregisterAllListeners } from 'c/pubsub'
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import getAttachments from '@salesforce/apex/PDFTron_ContentVersionController.getExistingAttachments'
import getBase64FromCv from '@salesforce/apex/PDFTron_ContentVersionController.getBase64FromCv'
import apexSearch from '@salesforce/apex/PDFTron_ContentVersionController.search'
import getFileDataFromId from '@salesforce/apex/PDFTron_ContentVersionController.getFileDataFromId'

export default class PdftronAttachmentPickerCombobox extends LightningElement {
  error

  @track isModalOpen = false

  @track value = ''
  @track lastRefresh;
  @track lastRefreshString = '';
  @track picklistOptions = []
  @track isSaving = false
  @track loadFinished = false
  documentsRetrieved = false
  @api recordId
  @track attachments = []
  @wire(CurrentPageReference) pageRef

  renderedCallback () {
    getAttachments({ recordId: this.recordId })
      .then(data => {
        this.attachments = data
        this.initLookupDefaultResults()
        this.error = undefined
        this.loadFinished = true
        this.documentsRetrieved = true
      })
      .catch(error => {
        console.error(error)
        this.showNotification('Error', error, 'error')
        this.error = error
        this.loadFinished = true
      })
  }

  connectedCallback () {
    registerListener('refreshOnSave', this.refreshOnSave, this)
    registerListener('viewerLoaded', this.handleInitialDocument, this)
    registerListener('lastRefresh', this.handleLastRefresh, this)
    this.initLookupDefaultResults()
  }

  disconnectedCallback () {
    unregisterAllListeners(this)
  }

  showNotification (title, message, variant) {
    const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: variant
    })
    this.dispatchEvent(evt)
  }

  initLookupDefaultResults () {
    // Make sure that the lookup is present and if so, set its default results
    const lookup = this.template.querySelector('c-lookup')
    if (lookup) {
      lookup.setDefaultResults(this.attachments)
    }
  }

  handleLastRefresh(event) {
    //slds-text-color_success
    this.lastRefreshString = 'Last updated '
    this.lastRefresh = Date.now()
  }

  handleInitialDocument() {
    //if attachments are present, load the first one
    if(this.attachments.length > 0) {
      this.handleFileLoad(this.attachments[0].id)
      this.template.querySelector('c-lookup').selection = this.attachments[0]
    }
  }

  handleSearch (event) {
    const lookupElement = event.target
    apexSearch(event.detail)
      .then(results => {
        lookupElement.setSearchResults(results)
      })
      .catch(error => {
        // TODO: handle error
        this.error = error
        console.error(error)
        let def_message =
          'We have encountered an error while searching for your file  ' +
          event.detail +
          '\n'

        this.showNotification(
          'Error',
          def_message + error.body.message,
          'error'
        )
      })
  }

  handleSingleSelectionChange (event) {
    this.checkForErrors()

    if (event.detail.length < 1) {
      this.handleClose()
      return
    }

    this.isLoading = true
    this.handleFileLoad(event.detail[0])
  }

  handleFileLoad(recordId) {
    this.isLoading = true
    this.lastRefreshString = 'Loading annotations...'
    getFileDataFromId({ Id: recordId })
    .then(result => {
      fireEvent(this.pageRef, 'blobSelected', result)
      this.isLoading = false
    })
    .catch(error => {
      this.isLoading = false
      // TODO: handle error
      this.error = error
      console.error(error)
      this.isLoading = false
      let def_message =
        'We have encountered an error while handling your file. '

      this.showNotification(
        'Error',
        def_message + error.body.message,
        'error'
      )
    })
  }

  //check for errors on selection
  checkForErrors () {
    this.errors = []
    const selection = this.template.querySelector('c-lookup').getSelection()
    // Custom validation rule
    if (this.isMultiEntry && selection.length > this.maxSelectionSize) {
      this.errors.push({
        message: `You may only select up to ${this.maxSelectionSize} items.`
      })
    }
    // Enforcing required field
    if (selection.length === 0) {
      this.errors.push({ message: 'Please make a selection.' })
    }
  }

  handleUploadFinished () {
    this.showNotification(
      'Success',
      'Your file has been attached to ' + this.recordId,
      'success'
    )
    this.refreshOnSave()
}

  refreshOnSave () {
    this.loadFinished = false
    getAttachments({ recordId: this.recordId })
      .then(data => {
        this.attachments = data
        this.initLookupDefaultResults()

        this.error = undefined
        this.loadFinished = true
        this.documentsRetrieved = true
      })
      .catch(error => {
        console.error(error)
        this.showNotification('Error', error, 'error')
        this.error = error

        this.loadFinished = true
      })
  }

  handleDownload () {
    fireEvent(this.pageRef, 'downloadDocument', '*')
  }

  handleClose () {
    this.lastRefresh = null
    this.lastRefreshString = ''
    fireEvent(this.pageRef, 'closeDocument', '*')
  }

  openModal () {
    this.isModalOpen = true
  }

  closeModal () {
    this.isModalOpen = false
  }
}