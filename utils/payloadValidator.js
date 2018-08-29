function validateFields (payload, checkClientId, res) {
  if (!payload || !(payload instanceof Object)) {
    res.render('error', { 'error': 'Invalid payload', shouldRetry: true });
    return false;
  }

  const validatePayload = ['clientId', 'prefix', 'shortDesc', 'longDesc'].filter(field => 'clientId' === field && checkClientId && !Object.keys(payload).includes(field));

  if (0 < validatePayload.length) {
    res.render('error', { 'error': `Missing fields ${validatePayload.join(', ')}`, shouldRetry: true });
    return false;
  }

  const { clientId, prefix, shortDesc } = payload;

  if (checkClientId && !/[0-9]{17,21}/.test(clientId)) {
    res.render('error', { 'error': 'Client ID must only consist of numbers and be 17-21 characters in length', shouldRetry: true });
    return false;
  }

  if (1 > prefix.length) {
    res.render('error', { 'error': 'Prefix may not be shorter than 1 character', shouldRetry: true });
    return false;
  }

  if (150 < shortDesc.length) {
    res.render('error', { 'error': 'Short description must not be longer than 150 characters', shouldRetry: true });
    return false;
  }

  return true;
}

module.exports = validateFields;
