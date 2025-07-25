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

// checks if the StorageAccessDto type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &StorageAccessDto{}

// StorageAccessDto struct for StorageAccessDto
type StorageAccessDto struct {
	// Access key for storage authentication
	AccessKey string `json:"accessKey"`
	// Secret key for storage authentication
	Secret string `json:"secret"`
	// Session token for storage authentication
	SessionToken string `json:"sessionToken"`
	// Storage URL
	StorageUrl string `json:"storageUrl"`
	// Organization ID
	OrganizationId string `json:"organizationId"`
	// S3 bucket name
	Bucket string `json:"bucket"`
}

type _StorageAccessDto StorageAccessDto

// NewStorageAccessDto instantiates a new StorageAccessDto object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewStorageAccessDto(accessKey string, secret string, sessionToken string, storageUrl string, organizationId string, bucket string) *StorageAccessDto {
	this := StorageAccessDto{}
	this.AccessKey = accessKey
	this.Secret = secret
	this.SessionToken = sessionToken
	this.StorageUrl = storageUrl
	this.OrganizationId = organizationId
	this.Bucket = bucket
	return &this
}

// NewStorageAccessDtoWithDefaults instantiates a new StorageAccessDto object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewStorageAccessDtoWithDefaults() *StorageAccessDto {
	this := StorageAccessDto{}
	return &this
}

// GetAccessKey returns the AccessKey field value
func (o *StorageAccessDto) GetAccessKey() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.AccessKey
}

// GetAccessKeyOk returns a tuple with the AccessKey field value
// and a boolean to check if the value has been set.
func (o *StorageAccessDto) GetAccessKeyOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.AccessKey, true
}

// SetAccessKey sets field value
func (o *StorageAccessDto) SetAccessKey(v string) {
	o.AccessKey = v
}

// GetSecret returns the Secret field value
func (o *StorageAccessDto) GetSecret() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Secret
}

// GetSecretOk returns a tuple with the Secret field value
// and a boolean to check if the value has been set.
func (o *StorageAccessDto) GetSecretOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Secret, true
}

// SetSecret sets field value
func (o *StorageAccessDto) SetSecret(v string) {
	o.Secret = v
}

// GetSessionToken returns the SessionToken field value
func (o *StorageAccessDto) GetSessionToken() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.SessionToken
}

// GetSessionTokenOk returns a tuple with the SessionToken field value
// and a boolean to check if the value has been set.
func (o *StorageAccessDto) GetSessionTokenOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.SessionToken, true
}

// SetSessionToken sets field value
func (o *StorageAccessDto) SetSessionToken(v string) {
	o.SessionToken = v
}

// GetStorageUrl returns the StorageUrl field value
func (o *StorageAccessDto) GetStorageUrl() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.StorageUrl
}

// GetStorageUrlOk returns a tuple with the StorageUrl field value
// and a boolean to check if the value has been set.
func (o *StorageAccessDto) GetStorageUrlOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.StorageUrl, true
}

// SetStorageUrl sets field value
func (o *StorageAccessDto) SetStorageUrl(v string) {
	o.StorageUrl = v
}

// GetOrganizationId returns the OrganizationId field value
func (o *StorageAccessDto) GetOrganizationId() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.OrganizationId
}

// GetOrganizationIdOk returns a tuple with the OrganizationId field value
// and a boolean to check if the value has been set.
func (o *StorageAccessDto) GetOrganizationIdOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.OrganizationId, true
}

// SetOrganizationId sets field value
func (o *StorageAccessDto) SetOrganizationId(v string) {
	o.OrganizationId = v
}

// GetBucket returns the Bucket field value
func (o *StorageAccessDto) GetBucket() string {
	if o == nil {
		var ret string
		return ret
	}

	return o.Bucket
}

// GetBucketOk returns a tuple with the Bucket field value
// and a boolean to check if the value has been set.
func (o *StorageAccessDto) GetBucketOk() (*string, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Bucket, true
}

// SetBucket sets field value
func (o *StorageAccessDto) SetBucket(v string) {
	o.Bucket = v
}

func (o StorageAccessDto) MarshalJSON() ([]byte, error) {
	toSerialize, err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o StorageAccessDto) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	toSerialize["accessKey"] = o.AccessKey
	toSerialize["secret"] = o.Secret
	toSerialize["sessionToken"] = o.SessionToken
	toSerialize["storageUrl"] = o.StorageUrl
	toSerialize["organizationId"] = o.OrganizationId
	toSerialize["bucket"] = o.Bucket
	return toSerialize, nil
}

func (o *StorageAccessDto) UnmarshalJSON(data []byte) (err error) {
	// This validates that all required properties are included in the JSON object
	// by unmarshalling the object into a generic map with string keys and checking
	// that every required field exists as a key in the generic map.
	requiredProperties := []string{
		"accessKey",
		"secret",
		"sessionToken",
		"storageUrl",
		"organizationId",
		"bucket",
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

	varStorageAccessDto := _StorageAccessDto{}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	err = decoder.Decode(&varStorageAccessDto)

	if err != nil {
		return err
	}

	*o = StorageAccessDto(varStorageAccessDto)

	return err
}

type NullableStorageAccessDto struct {
	value *StorageAccessDto
	isSet bool
}

func (v NullableStorageAccessDto) Get() *StorageAccessDto {
	return v.value
}

func (v *NullableStorageAccessDto) Set(val *StorageAccessDto) {
	v.value = val
	v.isSet = true
}

func (v NullableStorageAccessDto) IsSet() bool {
	return v.isSet
}

func (v *NullableStorageAccessDto) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableStorageAccessDto(val *StorageAccessDto) *NullableStorageAccessDto {
	return &NullableStorageAccessDto{value: val, isSet: true}
}

func (v NullableStorageAccessDto) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableStorageAccessDto) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}
