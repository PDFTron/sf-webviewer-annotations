@isTest
public class PDFTron_ContentVersionControllerTest {
@TestSetup
    static void setupTestData(){
        // BypassAllTriggers__c triggerSettings = new BypassAllTriggers__c();
        // triggerSettings.User_Ids__c = '123';
        // insert triggerSettings;
        //Other User
        String uniqueUserName = 'standarduser' + DateTime.now().getTime() + '@testorg.com';
        Profile p = [SELECT Id FROM Profile WHERE Name='Standard User'];
        User u = new User(
            Alias = 'standt', 
            Email='standarduser@testorg.com',
            EmailEncodingKey='UTF-8', 
            LastName='Testing', 
            LanguageLocaleKey='en_US',
            LocaleSidKey='en_US', 
            ProfileId = p.Id,
            TimeZoneSidKey='America/Los_Angeles',
            UserName=uniqueUserName
        );

        //Test Account
        Account a = new Account();
        a.Name = 'Test Account';

        insert a;

        //Test File
        ContentVersion contentVersion_1 = new ContentVersion(
            Title = 'some title',
            PathOnClient = 'some title'+'.pdf',
            VersionData = Blob.valueOf('some content to access later on'),
            IsMajorVersion = false /*so that can be updated later on*/
            );
        insert contentVersion_1;
        
    }
    @isTest static void testGetUser() {
        String userFullName = PDFTron_ContentVersionController.getUser();
        System.assertNotEquals(userFullName, null);
        User currentUser = [SELECT FirstName,LastName
            From User
            WHERE username = :UserInfo.getUsername()];
        System.assertEquals(currentUser.FirstName + ' ' +  currentUser.LastName, userFullName);
    }

    @isTest static void testGetBase64FromCv() {
        ContentVersion contentVersion_1 = [SELECT Id,Title,FileExtension, VersionData  FROM ContentVersion WHERE Title = 'some title' LIMIT 1];
        System.assertNotEquals(contentVersion_1.Id, null);
        
        PDFTron_ContentVersionController.ContentVersionWrapper cvw = PDFTron_ContentVersionController.getBase64FromCv(contentVersion_1.Id + '');
        System.assertNotEquals(cvw.body, null);
    }

    @isTest static void testGetAttachments() {

        ContentVersion contentVersion_1 = [SELECT Id,Title,FileExtension, VersionData, ContentDocumentId  FROM ContentVersion WHERE Title = 'some title' LIMIT 1];
        Account a = [SELECT Id FROM Account WHERE Name = 'Test Account'];
        ContentDocumentLink contentDocumentLink = new ContentDocumentLink(LinkedEntityId = a.Id, ContentDocumentId = contentVersion_1.ContentDocumentId, ShareType = 'V');
        insert contentDocumentLink;

        string id = a.Id + '';
        PDFTron_ContentVersionController.getExistingAttachments(id);
        List<PDFTron_ContentVersionController.ContentVersionWrapper> cvwList = PDFTron_ContentVersionController.getAttachments(id);

        System.assertEquals(cvwList.size(), 1);
    }

    @isTest static void testSaveDocument() {
        String payload =  '{"title": "file-sample_150kB test", "filename": "file-sample_150kB test.pdf", "contentDocumentId": "0685Y00000QUaQGQA1" }';

        PDFTron_ContentVersionController.PDFTron_ContentVersionPayload cvp = new PDFTron_ContentVersionController.PDFTron_ContentVersionPayload(payload);

        cvp.base64Data = EncodingUtil.base64Encode(Blob.valueOf('Test Blob Data'));

        ContentVersion contentVersion_1 = [SELECT Id,Title,FileExtension, VersionData  FROM ContentVersion WHERE Title = 'some title' LIMIT 1];
        Account a = [SELECT Id FROM Account WHERE Name = 'Test Account'];
        String cvId = PDFTron_ContentVersionController.saveDocument(JSON.serialize(cvp), a.Id, contentVersion_1.Id);

        List<ContentVersion> savedDocuments = [SELECT Id,VersionData FROM ContentVersion WHERE Title = 'file-sample_150kB test'];
        System.assertEquals(savedDocuments.size(), 1);
    }
    @isTest static void testGetFileDataFromId(){
        ContentVersion contentVersion_1 = [SELECT Id,Title, FileExtension, ContentSize, VersionData, ContentDocumentId, LastModifiedDate FROM ContentVersion WHERE Title = 'some title' LIMIT 1];
        PDFTron_ContentVersionController.getFileDataFromId(contentVersion_1.Id);
    }
     @isTest static void testGetFileLogo(){
         String extension='pdf';
         String extension1='doc';
         String extension2='xls';
         String extension3='tif';
        PDFTron_ContentVersionController.getFileLogo(extension); 
        PDFTron_ContentVersionController.getFileLogo(extension1);
        PDFTron_ContentVersionController.getFileLogo(extension2);
        PDFTron_ContentVersionController.getFileLogo(extension3);
    }
    @isTest static void testconvertBytesToFormattedString(){
        Long value=1024;
        Long value1=1029;
        Long value2=1048577;
        Long value3=1073741824;
        Long value4=1022;
        PDFTron_ContentVersionController.convertBytesToFormattedString(value);
        PDFTron_ContentVersionController.convertBytesToFormattedString(value1);
        PDFTron_ContentVersionController.convertBytesToFormattedString(value2);
        PDFTron_ContentVersionController.convertBytesToFormattedString(value3);
        PDFTron_ContentVersionController.convertBytesToFormattedString(value4);
            }
    
    
    @isTest static void testgetProfile(){
        PDFTron_ContentVersionController.getProfile();
    } 
    
    
    @isTest static void testgetAnnotations(){
         ContentVersion contentVersion_1 = new ContentVersion(
            Title = 'some title',
            PathOnClient = 'some title'+'.pdf',
            VersionData = Blob.valueOf('some content to access later on'),
            IsMajorVersion = false /*so that can be updated later on*/
            );
        insert contentVersion_1;
        Annotation__c ann = new Annotation__c(Annotation_Id__c='111',Content_Version_Id__c=contentVersion_1.Id,xfdfString__c='<?xml version="1.0" encoding="UTF-8"?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"></xfdf>');
        insert ann;
        PDFTron_ContentVersionController.getAnnotations(contentVersion_1.Id);        
    }
    
    @isTest static void testsaveAnnotations(){
        ContentVersion contentVersion_1 = new ContentVersion(
            Title = 'some title',
            PathOnClient = 'some title'+'.pdf',
            VersionData = Blob.valueOf('some content to access later on'),
            IsMajorVersion = false /*so that can be updated later on*/
            );
        insert contentVersion_1;
        Annotation__c ann = new Annotation__c(Annotation_Id__c='111',Content_Version_Id__c=contentVersion_1.Id,xfdfString__c='<?xml version="1.0" encoding="UTF-8"?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields /><add><square page="0" rect="358.930,473.900,445.330,542.270" color="#E44234"/></<add></xfdf>');
        insert ann;
        
        PDFTron_ContentVersionController.saveAnnotations('delete',contentVersion_1.Id,'111','<?xml version="1.0" encoding="UTF-8"?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields /><add><square page="0" rect="358.930,473.900,445.330,542.270" color="#E44234"/></<add></xfdf>');
        
        ContentVersion contentVersion_2 = new ContentVersion(
            Title = 'some title',
            PathOnClient = 'some title'+'.pdf',
            VersionData = Blob.valueOf('some content to access later on'),
            IsMajorVersion = false /*so that can be updated later on*/
            );
        insert contentVersion_2;
        /*Annotation__c ann1 = new Annotation__c(Annotation_Id__c='112',Content_Version_Id__c=contentVersion_2.Id,xfdfString__c='<?xml version="1.0" encoding="UTF-8"?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields /><add><square page="0" rect="358.930,473.900,445.330,542.270" color="#E44234"/></<add></xfdf>');
        insert ann;*/
        PDFTron_ContentVersionController.saveAnnotations('',contentVersion_1.Id,'112','<?xml version="1.0" encoding="UTF-8"?><xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve"><fields /><add><square page="0" rect="358.930,473.900,445.330,542.270" color="#E44234"/></<add></xfdf>');
        
    }
    
}