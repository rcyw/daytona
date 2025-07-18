/*
Daytona

Daytona AI platform API Docs

API version: 1.0
Contact: support@daytona.com
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package apiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
)

// checks if the ComputerUseStopResponse type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &ComputerUseStopResponse{}

// ComputerUseStopResponse struct for ComputerUseStopResponse
type ComputerUseStopResponse struct {
	// A message indicating the result of stopping computer use processes
	Message string `json:"message"`
	// Status information about all VNC desktop processes after stopping
	Status map[string]interface{} `json:"status"`
}

type _ComputerUseStopResponse ComputerUseStopResponse

// NewComputerUseStopResponse instantiates a new ComputerUseStopResponse object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewComputerUseStopResponse(message string, status map[string]interface{}) *ComputerUseStopResponse {
	this := ComputerUseStopResponse{}
	this.Message = message
	this.Status = status
	return &this
}

// NewComputerUseStopResponseWithDefaults instantiates a new ComputerUseStopResponse object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewComputerUseStopResponseWithDefaults() *ComputerUseStopResponse {
	this := ComputerUseStopResponse{}
	return &this
}

// GetMessage returns the Message field value
func (o *ComputerUseStopResponse) GetMessage() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Message
}

// GetMessageOk returns a tuple with the Message field value
// and a boolean to check if the value has been set.
func (o *ComputerUseStopResponse) GetMessageOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Message, true
}

// SetMessage sets field value
func (o *ComputerUseStopResponse) SetMessage(v string) {
	o.Message = v
}

// GetStatus returns the Status field value
func (o *ComputerUseStopResponse) GetStatus() map[string]interface{} {
	if o == nil {
		var ret map[string]interface{}
		return ret
	}

	return o.Status
}

// GetStatusOk returns a tuple with the Status field value
// and a boolean to check if the value has been set.
func (o *ComputerUseStopResponse) GetStatusOk() (map[string]interface{}, bool) {
	if o == nil {
		return map[string]interface{}{}, false
	}
	return o.Status, true
}

// SetStatus sets field value
func (o *ComputerUseStopResponse) SetStatus(v map[string]interface{}) {
	o.Status = v
}

func (o ComputerUseStopResponse) MarshalJSON() ([]byte, error) {
	toSerialize, err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o ComputerUseStopResponse) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["message"] = o.Message
	toSerialize["status"] = o.Status
	return toSerialize, nil
}

func (o *ComputerUseStopResponse) UnmarshalJSON(data []byte) (err error) {
	// This validates that all required properties are included in the JSON object
	// by unmarshalling the object into a generic map with string keys and checking
	// that every required field exists as a key in the generic map.
	requiredProperties := []string{
		"message",
		"status",
	}

	allProperties := make(map[string]interface{})

	err = json.Unmarshal(data, &allProperties)

	if err != nil {
		return err
	}

	for _, requiredProperty := range requiredProperties {
		if _, exists := allProperties[requiredProperty]; !exists {
			return fmt.Errorf("no value given for required property %v", requiredProperty)
		}
	}

	varComputerUseStopResponse := _ComputerUseStopResponse{}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&varComputerUseStopResponse)

	if err != nil {
		return err
	}

	*o = ComputerUseStopResponse(varComputerUseStopResponse)

	return err
}

type NullableComputerUseStopResponse struct {
	value *ComputerUseStopResponse
	isSet bool
}

func (v NullableComputerUseStopResponse) Get() *ComputerUseStopResponse {
	return v.value
}

func (v *NullableComputerUseStopResponse) Set(val *ComputerUseStopResponse) {
	v.value = val
	v.isSet = true
}

func (v NullableComputerUseStopResponse) IsSet() bool {
	return v.isSet
}

func (v *NullableComputerUseStopResponse) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableComputerUseStopResponse(val *ComputerUseStopResponse) *NullableComputerUseStopResponse {
	return &NullableComputerUseStopResponse{value: val, isSet: true}
}

func (v NullableComputerUseStopResponse) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableComputerUseStopResponse) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}
