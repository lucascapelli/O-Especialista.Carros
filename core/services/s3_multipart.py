import boto3
import json
from django.conf import settings
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

class S3MultipartUpload:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket = settings.AWS_STORAGE_BUCKET_NAME
    
    def initiate_upload(self, key, content_type, metadata=None):
        """Inicia upload multipart"""
        try:
            response = self.s3_client.create_multipart_upload(
                Bucket=self.bucket,
                Key=key,
                ContentType=content_type,
                Metadata=metadata or {}
            )
            return response['UploadId']
        except ClientError as e:
            logger.error(f"Erro ao iniciar upload multipart: {e}")
            return None
    
    def generate_presigned_url(self, key, upload_id, part_number):
        """Gera URL assinada para upload de parte"""
        try:
            url = self.s3_client.generate_presigned_url(
                ClientMethod='upload_part',
                Params={
                    'Bucket': self.bucket,
                    'Key': key,
                    'UploadId': upload_id,
                    'PartNumber': part_number
                },
                ExpiresIn=3600  # 1 hora
            )
            return url
        except ClientError as e:
            logger.error(f"Erro ao gerar URL assinada: {e}")
            return None
    
    def complete_upload(self, key, upload_id, parts):
        """Completa upload multipart"""
        try:
            response = self.s3_client.complete_multipart_upload(
                Bucket=self.bucket,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            return response['Location']
        except ClientError as e:
            logger.error(f"Erro ao completar upload: {e}")
            return None
    
    def abort_upload(self, key, upload_id):
        """Aborta upload multipart"""
        try:
            self.s3_client.abort_multipart_upload(
                Bucket=self.bucket,
                Key=key,
                UploadId=upload_id
            )
            return True
        except ClientError as e:
            logger.error(f"Erro ao abortar upload: {e}")
            return False