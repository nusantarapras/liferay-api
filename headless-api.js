async function getLiferayToken(host,clientId,clientSecret) {
    let params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    const url = host + '/o/oauth2/token';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get token: ${response.status} - ${errorData.error_description || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
//        console.log('Token berhasil didapatkan:', data);
        return data.access_token;
    } catch (error) {
        console.error('Error saat melakukan request token:', error);
        throw error;
    }
}

async function getHeadlessAPI(host, clientId, clientSecret, apiEndpoint, method = 'GET', body = null) {

    try {
        // 1. Dapatkan token terlebih dahulu
        const accessToken = await getLiferayToken(host,clientId,clientSecret);

        if (!accessToken) {
            throw new Error('Tidak dapat memperoleh Access Token. Panggilan API dibatalkan.');
        }

        // 2. Lanjutkan dengan panggilan API menggunakan token yang didapat
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        const fetchOptions = {
            method: method,
            headers: headers
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            fetchOptions.body = JSON.stringify(body);
        }
        
        const fixUrl = host+apiEndpoint;

        const response = await fetch(fixUrl, fetchOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API call failed: ${response.status} - ${errorData.error_description || JSON.stringify(errorData)}`);
        }

        const data = await response.json();
//        console.log('Data dari Liferay API:', data);
        return data; // Mengembalikan data dari API
    } catch (error) {
        console.error('Error saat memanggil API Liferay:', error);
        throw error; // Lempar error untuk penanganan lebih lanjut
    }
}

function getValueByFieldName(fields, fieldName) {
    const field = fields.find(f => f.name === fieldName);
    if (!field) return undefined;

    if (field.dataType === 'string' || field.dataType === 'text' || field.dataType === 'boolean' || field.dataType === 'number') {
        return field.contentFieldValue.data;
    } 
    else if(field.dataType === 'date') {
        if(field.contentFieldValue.data) return new Date(field.contentFieldValue.data);
        return null;
    }
    else if (field.dataType === 'image' && field.contentFieldValue.image) {
        // Untuk icon, kita langsung kembalikan objek image-nya agar bisa diolah lebih lanjut
        return field.contentFieldValue.image;
    }
    else if (field.dataType === 'document' && field.contentFieldValue.document) {
        // Untuk icon, kita langsung kembalikan objek image-nya agar bisa diolah lebih lanjut
        return field.contentFieldValue.document;
    }
    return undefined;
}

function mapData(records){
	let objReturn = {};
	records.forEach(record => {
		const key = record.name;
		const type = record.dataType;
		const repeatable = record.repeatable;
		let value = ''
		if(type == 'date') value = (new Date(record.contentFieldValue.data));
		else if(type == 'image' && record.contentFieldValue.image) value = record.contentFieldValue.image.contentUrl;
		else if(type == 'document' && record.contentFieldValue.document) value = record.contentFieldValue.document.contentUrl;
		else value = record.contentFieldValue.data;

		if(repeatable){
			if(!objReturn[key]) objReturn[key] = [];
			objReturn[key].push(value);
		} else {
			objReturn[key] = value;
		}
	});
	return objReturn;
}

function formatISO(date){
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() dimulai dari 0
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


