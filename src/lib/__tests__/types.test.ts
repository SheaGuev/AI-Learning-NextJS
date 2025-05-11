import { 
  loginFormSchema, 
  createWorkspaceFormSchema,
  UploadBannerFormSchema
} from '../types';

describe('types', () => {
  describe('loginFormSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const result = loginFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123'
      };
      
      const result = loginFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.email).toBeDefined();
      }
    });
    
    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short'
      };
      
      const result = loginFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.password).toBeDefined();
      }
    });
  });
  
  describe('createWorkspaceFormSchema', () => {
    it('should validate correct workspace data', () => {
      const validData = {
        workspaceName: 'Test Workspace',
        logo: 'logo-data'
      };
      
      const result = createWorkspaceFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject short workspace name', () => {
      const invalidData = {
        workspaceName: 'Tes',
        logo: 'logo-data'
      };
      
      const result = createWorkspaceFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.workspaceName).toBeDefined();
      }
    });
  });
  
  describe('UploadBannerFormSchema', () => {
    it('should validate correct banner data', () => {
      const validData = {
        banner: 'banner-image-data'
      };
      
      const result = UploadBannerFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject missing banner', () => {
      const invalidData = {};
      
      const result = UploadBannerFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.banner).toBeDefined();
      }
    });
  });
}); 