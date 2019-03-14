// jquery datepicker configuration
$('#date').datepicker({ 
    minDate: 0,
    dateFormat: 'dd/mm/yy'
});

// button reference
const checkVendorButton = document.querySelector("#check_vendor");
const submitVendorButton = document.querySelector("#submit_vendor");

// firebase firestore reference
var db = firebase.firestore();
const vendorRef = db.collection("vendors")
const jobRequestRef = db.collection("job_requests")

// On start, hide the following DOM element
$(document).ready(function(){
    document.getElementById("submit_vendor_form").style.display = 'none';
    document.getElementById("date_error").style.display = 'none';
    document.getElementById("vendor_not_select_error").style.display = 'none';
    document.getElementById("email_address_error").style.display = 'none';
    document.getElementById("location_error").style.display = 'none';
});


// Jquery state listener of email address, location and date
// If state changed, hide the error message
$('#email_address').change(function(){
   document.getElementById("email_address_error").style.display = 'none';
});

$('#location').change(function(){
    document.getElementById("location_error").style.display = 'none';
 });

 $('#date').change(function(){
    document.getElementById("date_error").style.display = 'none';
 });

// ====================================== Separator ========================================

/**
 * 
 * @param {*} email 
 * 
 * Regrex validate email
 */
function isEmailValid(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * if input is invalid, show a small error message beside each field
 */
function isInputValid() {
    var email = document.getElementById("email_address").value;  
    var userLocation = document.getElementById("location").value;  
    var userDate = document.getElementById("date").value;    

    if(email == '' || !isEmailValid(email)) { 
        document.getElementById("email_address_error").style.display = 'inline';
        return false;
    }
    else if(userLocation == '') { 
        document.getElementById("location_error").style.display = 'inline';
        return false;
    }
    else if(userDate == '') { 
        document.getElementById("date_error").style.display = 'inline';
        return false;
    }
    return true;
}

 /**
  * 
  * @param {*} dateFrom 
  * @param {*} DateTo 
  * @param {*} dateSubmitted 
  * 
  * This function is to check the date user submitted request
  * againts the range of date that vendors not available
  * 
  * For instance, if vendor is not available in 15/3/2019 to 20/3/2019 ,
  * and user submit request on 17/3/2019, this function will return boolean true
  * indicating that vendor is not available
  */
function checkDate(dateFrom, dateTo, dateSubmitted) {
    console.log("Date User Submit: ", dateSubmitted)
    console.log("Date Vendor Not Available From: ", dateFrom)
    console.log("Date Vendor Not Available To: ", dateTo)

    var dateFrom = dateFrom.split("/");
    var dateTo = dateTo.split("/");
    var dateSubmitted = dateSubmitted.split("/");

    var dateFrom = new Date(dateFrom[2], parseInt(dateFrom[1])-1, dateFrom[0]);  // -1 because months are from 0 to 11
    var dateTo   = new Date(dateTo[2], parseInt(dateTo[1])-1, dateTo[0]);
    var dateSubmitted = new Date(dateSubmitted[2], parseInt(dateSubmitted[1])-1, dateSubmitted[0]);

    var isWithinRange = dateSubmitted >= dateFrom && dateSubmitted <= dateTo;
    
    console.log("Is vendor not avalable ? ", isWithinRange);
    return isWithinRange;
}


checkVendorButton.addEventListener("click", function() {
    vendorRef.get().then(function (querySnapshot) {
        
        // clear submit vendor form if existed
        if($("#submit_vendor_form").is(":visible")){
            var oldVendorList = document.getElementById("vendors_list");
            while (oldVendorList.firstChild) {
                oldVendorList.removeChild(oldVendorList.firstChild);
            }
        } 

        if(!isInputValid()) {
            console.log("input invalid");
            return;
        }

        var email = document.getElementById("email_address").value;  
        var userLocation = document.getElementById("location").value;  
        var userDate = document.getElementById("date").value;  
        var isGotVendor = false;

        console.log("==================== User Submitted data ====================")
        console.log(email)
        console.log(userDate)
        console.log(userLocation)

        // vendor matching algorithm start here
        console.log("==================== Vendor Matching start ====================")

        let i = 1;

        querySnapshot.forEach(function(doc) {
            // Get all the data from documents
            const vendorData = doc.data();

            // extract location, availability, date_from, date_to
            var vendorLocation = vendorData.location;
            var availability = vendorData.availability;
            var dateFrom = vendorData.date_from;
            var dateTo = vendorData.date_to;

            // assume all vendors are available now
            var dateWithinRangeVendorNotAvailable = false;

            // if vendor is not available for certain date, 
            // compare the date submitted by user and the date range of vendors is not available
            if(availability == false) {
                console.log("Vendor name ", i, ": ", vendorData.vendor_name)
                i++;
                console.log("Vendor location: ", vendorLocation)
                dateWithinRangeVendorNotAvailable = checkDate(dateFrom, dateTo, userDate);
            }
       
            // if vendor location is user location submitted AND 
            // vendors are available on user subbmited date
            if(vendorLocation == userLocation && dateWithinRangeVendorNotAvailable == false) {
                isGotVendor = true;
                var vendorName = vendorData.vendor_name;

                // populate list of checkbox with available vendors name
                $("#vendors_list").append("<input class='w3-check' type='checkbox' name='vendor_name' value='" + vendorName + "'>" + vendorName + "<br/>");
            } 
        });

        // If there is no vendor, alert the users, 
        // else, show the submit vendor form child element
        if(!isGotVendor) {
            console.log("No vendor found")
            $('#errorModal').modal('show'); 
            document.getElementById("submit_vendor_form").style.display = 'none';
        } else {
            console.log("Vendors found")
            document.getElementById("submit_vendor_form").style.display = 'block';
        }

        // only allow one checkbox at a time
        $('[type="checkbox"]').change(function(){
            if(this.checked){
                $('[type="checkbox"]').not(this).prop('checked', false);
                document.getElementById("vendor_not_select_error").style.display = 'none';
            }    
        });

    }).catch(function (error) {
        console.log("Got an error ", error)
    });
});


submitVendorButton.addEventListener("click", function() {

    // ensure at least one vendor is check
    var atLeastOneIsChecked = $('input[name="vendor_name"]:checked').length > 0;

    console.log("submitVendorButton");

    if(atLeastOneIsChecked && isInputValid()) {

        var email = document.getElementById("email_address").value;  
        var location = document.getElementById("location").value;  
        var userSubmitDate = document.getElementById("date").value; 
        var selectedvendor = $("input[type='checkbox']").val();

        console.log("Submit Vendor input valid")

        // send email to confirm vendor request
        var email = document.getElementById("email_address").value;
            
        sendEmail(email, selectedvendor);
        postToJobRequest(email, userSubmitDate, location, selectedvendor)
        clearForm();
    } else {
        if (!atLeastOneIsChecked) {
            document.getElementById("vendor_not_select_error").style.display = 'inline';
        } 
    }
});

/**
 * 
 * @param {*} email 
 * @param {*} selectedvendor 
 * 
 * Send an email to confirm the vendor booking
 */
function sendEmail(email, selectedvendor) {
    var template_params = {
        "to_email": email,
        "vendor_name": selectedvendor
    }

    var service_id = "default_service";
    var template_id = "template_QqkG7Oxi";
    emailjs.send(service_id, template_id, template_params);

    alertify.success("Vendor Confirmation Email sent");
    console.log("Email sent")
}

/**
 * 
 * @param {*} email 
 * @param {*} date 
 * @param {*} location 
 * @param {*} selectedvendor 
 * 
 * Post user submitted job request to firebase Firestore
 */
function postToJobRequest(email, date, location, selectedvendor) {
    jobRequestRef.add({
        user_email	: email,
        submit_location: location,
        date_request: date,
        vendor_name: selectedvendor,
        status: "pending"
    }).then(function() {
        console.log("New JobRequest Document successfully written!");
    }).catch(function(error) {
        console.error("Error writing JobRequest document: ", error);
    });
}

/**
 * After user subbmited, reset the form
 */
function clearForm() {
    document.getElementById("check_vendor_form").reset();

    // clear submit vendor form if existed
    var oldVendorList = document.getElementById("vendors_list");
    while (oldVendorList.firstChild) {
        oldVendorList.removeChild(oldVendorList.firstChild);
    }
    document.getElementById("submit_vendor_form").style.display = 'none';
    console.log("Clear form")
}